'use strict';

const app = require('./server/server');
const datasources = app.datasources;
const fs = require('fs');
const commander = require('commander');
const defaultProperties = ['type', 'required', 'length', 'id'];

function readFile(modelName) {
  return new Promise((resolve, reject) => {
    // filenames are in hyphen separated format
    const fileName = PascalToHyphen(modelName);
    fs.readFile('common/models/' + fileName + '.json', 'utf8', (err, buffer) => {
      if (err) {
        console.log(fileName + '.json does not exist, use -a option to add new models');
        reject();
      }
      console.log(fileName + '.json read successfully');
      resolve(JSON.parse(buffer));
    });
  });
};

function createModel(modelName, databaseName) {
  // TODO
}

function defaultReplace(originalModel, databaseName) {
  let tableName;

  // check if tablename is defined in model
  if (originalModel[databaseName])
    tableName = originalModel[databaseName].table;
  // if not, use underscore format
  else
    tableName = PascalToUnderscore(originalModel.name);

  console.log('database table name found: ' + tableName);

  return new Promise((resolve, reject) => {
    datasources[databaseName].discoverSchema(tableName, function (err, schema) {
      if (err) {
        console.log(tableName + ' does not exist in database ' + databaseName);
        reject();
      }

    // Go through properties in schema
      for (const property of Object.keys(schema.properties)) {
        // create properties that don't exist in model
        if (!originalModel.properties[property]) {
          originalModel.properties[property] = {};
        }
        for (const setting of Object.keys(schema.properties[property])) {
          if (defaultProperties.includes(setting)) {
            originalModel.properties[property][setting] = schema.properties[property][setting];
            console.log('Updated model: ' + originalModel.name + ', Property: ' + property + ', Setting: ' + setting);
          }
        }
      }
      resolve(originalModel);
    });
  });
}

function discoverDatabaseModels(databaseName) {
  return new Promise((resolve, reject) => {
    datasources[databaseName].discoverModelDefinitions({owner: datasources[databaseName].settings.database}, (err, result) => {
      if (err) {
        console.error(err);
        reject();
      }
      resolve(result);
    });
  });
}

function PascalToHyphen(modelName) {
  return modelName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function PascalToUnderscore(modelName) {
  return modelName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function UnderscoreToPascal(tableName) {
  // TODO
}

function writeFile(newModel) {
  fs.writeFileSync('common/models/' + PascalToHyphen(newModel.name) + '.json', JSON.stringify(newModel, null, 2));
  console.log('-------------------------------');
  console.log('Model JSON file update complete');
}

async function commanderHandler(databaseName, modelNames) {
  // add or update models
  if (commander.add) {
    // discover databases
    const modelDefinitionArray = await discoverDatabaseModels(databaseName);
    for (const modelDefinition of modelDefinitionArray) {
      const modelName = UnderscoreToPascal(modelDefinition.name);
      // model file already exists
      if (app.models[modelDefinition.name]) {
        // TODO: write function underscore to pascal for modelDefinition.name
        const originalModels = await readFile(modelName);
        if (originalModels) {
          const newModel = await defaultReplace(originalModels, databaseName);
          if (newModel) {
            writeFile(newModel);
          }
        }
        // model file doesn't exist
      } else {
        const newModel = await createModel(modelName, databaseName);
        if (newModel) {
          writeFile(newModel);
        }
      }
    }
  } else {
  // no options selected
    for (const modelName of modelNames) {
      const originalModels = await readFile(modelName);
      if (originalModels) {
        const newModel = await defaultReplace(originalModels, databaseName);
        if (newModel) {
          writeFile(newModel);
        }
      }
    }
  }
}

commander
  .description('An npm module to automatically update Loopback models according to schema')
  .arguments('<databaseName> [modelNames...]')
  .option('-u, --update', 'update all models')
  .option('-a, --add', 'adds or updates stated models from database')
  .option('-e, --addEveryModel', 'add all models from the database')
  .option('-p, --properties', 'update and add all non-default properties')
  .option('-d, --delete', 'delete models and properties that are not in database')
  .action((databaseName, modelNames) => {
    commanderHandler(databaseName, modelNames);
  })
  .parse(process.argv);


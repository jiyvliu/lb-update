'use strict';

const app = require('./server/server');
const datasources = app.datasources;
const fs = require('fs');
const commander = require('commander');
const defaultProperties = ['type', 'required', 'length', 'id'];

function readModelFile(modelName) {
  return new Promise((resolve, reject) => {
    // filenames are in hyphen separated format
    const fileName = PascalToHyphen(modelName);
    fs.readFile('common/models/' + fileName + '.json', 'utf8', (err, buffer) => {
      if (err) {
        throw new Error(fileName + '.json does not exist, use -a option to add new models');
      } else {
        console.log(fileName + '.json read successfully');
        resolve(JSON.parse(buffer));
      }
    });
  });
};

function readConfigFile() {
  return new Promise((resolve, reject) => {
    fs.readFile('./server/model-config.json', (err, buffer) => {
      if (err) {
        throw new Error('Could not read model-config.json');
      } else {
        console.log('model-config.json read successfully');
        resolve(JSON.parse(buffer));
      }
    });
  });
}

function createModel(modelName, databaseName) {
  return new Promise((resolve, reject) => {
    const tableName = PascalToUnderscore(modelName);
    console.log('Discovering schema from ' + databaseName + ' for model: ' + modelName);
    datasources[databaseName].discoverSchema(tableName, function (err, schema) {
      if (err) {
        throw new Error('Unable to access database: ' + databaseName);
      } else {
        for (const property of Object.keys(schema.properties)) {
          console.log('Added property ' + property + ' to ' + modelName);
          for (const setting of Object.keys(schema.properties[property])) {
            if (!defaultProperties.includes(setting) || commander.properties) {
              delete schema.properties[property][setting];
            }
          }
        }
        resolve(schema);
      }
    });
  });
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
        throw new Error(tableName + ' does not exist in database ' + databaseName);
      } else {
      // Go through properties in schema
        for (const property of Object.keys(schema.properties)) {
        // create properties that don't exist in model
          if (!originalModel.properties[property]) {
            originalModel.properties[property] = {};
          }
          for (const setting of Object.keys(schema.properties[property])) {
            if (defaultProperties.includes(setting) || commander.properties) {
              originalModel.properties[property][setting] = schema.properties[property][setting];
              console.log('Updated model: ' + originalModel.name + ', Property: ' + property + ', Setting: ' + setting);
            }
          }
        }
        resolve(originalModel);
      }
    });
  });
}

function discoverDatabaseModels(databaseName) {
  return new Promise((resolve, reject) => {
    datasources[databaseName].discoverModelDefinitions({owner: datasources[databaseName].settings.database}, (err, result) => {
      if (err) {
        throw new Error('Unable to access database: ' + databaseName);
      } else {
        resolve(result);
      }
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
  let PascalCased = tableName.replace(/_([a-z])/g, (g) => {
    return g[1].toUpperCase();
  });
  PascalCased = PascalCased[0].toUpperCase() + PascalCased.slice(1);
  return PascalCased;
}

function writeFile(newModel) {
  fs.writeFileSync('common/models/' + PascalToHyphen(newModel.name) + '.json', JSON.stringify(newModel, null, 2));
  console.log('-------------------------------');
  console.log(newModel.name + ' JSON file update complete');
}

function writeConfigFile(modelConfigObject) {
  fs.writeFileSync('./server/model-config.json', JSON.stringify(modelConfigObject, null, 2));
  console.log('Model-config file update complete');
}

async function commanderHandler(databaseName, modelNames) {
  // add or add all models
  if (commander.add || commander.addEveryModel) {
    console.log('Adding new models');
    const modelConfigObject = await readConfigFile();
    // discover databases
    const modelDefinitionArray = await discoverDatabaseModels(databaseName);
    for (const modelDefinition of modelDefinitionArray) {
      const modelNameFromDatabase = UnderscoreToPascal(modelDefinition.name);
      // Only update requested models unless user wants to add all models
      if (!modelNames.includes(modelNameFromDatabase) && !commander.addEveryModel) {
        continue;
      }
      // model already exists
      if (app.models[modelNameFromDatabase]) {
        console.log(modelNameFromDatabase + ' already exists, use default command or -u to update, continuing to next model');
        continue;
      // model file doesn't exist, then add it
      } else {
        const newModel = await createModel(modelNameFromDatabase, databaseName);
        if (newModel) {
          writeFile(newModel);
        }
        // add model to model-config
        modelConfigObject[modelNameFromDatabase] = {dataSource: databaseName, public: true};
        console.log(modelNameFromDatabase + ' added to model-config file');
      }
    }
    // write model-config file
    writeConfigFile(modelConfigObject);
  // update all models
  } else if (commander.update) {
    for (const modelName of Object.keys(app.models)) {
      if (app.models[modelName].config.dataSource.name !== databaseName)
        continue;
      console.log(modelName + ' is suppose to be updated here but it\'s not implemented yet');
    }
  } else {
  // no options selected
    for (const modelName of modelNames) {
      const originalModels = await readModelFile(modelName);
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
  .option('-a, --add', 'adds stated models from database')
  .option('-e, --addEveryModel', 'add all models from the database')
  .option('-p, --properties', 'update and add all non-default properties')
  .option('-d, --delete', 'delete models and properties that are not in database')
  .action((databaseName, modelNames) => {
    commanderHandler(databaseName, modelNames);
  })
  .parse(process.argv);


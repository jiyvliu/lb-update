'use strict';

const app = require('./server/server');
const datasources = app.datasources;
const fs = require('fs');
const commander = require('commander');
const defaultProperties = ['type', 'required', 'length', 'id'];

function readFile(fileName) {
  fs.readFile('common/models/' + fileName + '.json', (err, buffer) => {
    if (err) {
      console.log(fileName + ' does not exist, use -a option to add new models');
      return;
    }
    return JSON.parse(buffer);
  });
}

function defaultReplace(originalModel, databaseName) {
  let tableName;

  // check if tablename is defined in model
  if (originalModel[databaseName])
    tableName = originalModel[databaseName].table;
  // if not, use underscore format
  else
    tableName = camelToUnderscore(originalModel.name);

  datasources[databaseName].discoverSchema(tableName, function (err, schema) {
    if (err) {
      console.log(tableName + ' does not exist in database ' + databaseName);
      return;
    }

    // Go through properties in schema
    for (const property of Object.keys(schema.properties)) {
      for (const setting of Object.keys(schema.properties[property])) {
        if (defaultProperties.includes(setting)) {
          originalModel.properties[property][setting] = schema.properties[property][setting];
          console.log('Updated model: ' + originalModel.name + ' property: ' + originalModel.properties[property]);
        }
      }
    }
  });

  return originalModel;
}

function camelToHyphen(modelName) {
  return modelName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function camelToUnderscore(modelName) {
  return modelName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function writeFile(newModel) {
  fs.writeFileSync('common/models/' + camelToHyphen(newModel.name) + '.json', JSON.stringify(newModel, null, 2));
  console.log('-------------------------------');
  console.log('Model JSON file update complete');
}

commander
  .description('An npm module to automatically update Loopback models according to schema')
  .arguments('<databaseName> [modelNames...]')
  .option('-u, --update', 'update all models')
  .option('-a, --add', 'adds or updates stated models from database')
  .option('-e, --addEveryModel', 'add all models from the database')
  .option('-p, --properties', 'update and add all properties')
  .option('-d, --delete', 'delete models and properties that are not in database')
  .action((databaseName, modelNames) => {
    // no options selected
    for (const modelName of modelNames) {
      const originalModel = readFile(camelToHyphen(modelName));
      if (originalModel) {
        const newModel = defaultReplace(originalModel, databaseName);
        if (newModel) {
          writeFile(newModel);
        }
      }
      process.exit(0);
    }
  })
  .parse(process.argv);


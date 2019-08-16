#!/usr/bin/env node
'use strict';

const path = require('path');
const pkag = require('./package.json');
const app = require(path.join(pkag._where, 'server/server'));
const datasources = app.datasources;
const commander = require('commander');
const defaultProperties = ['type', 'required', 'length', 'id'];
const tools = require('./tools');

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

function createModel(modelName, databaseName) {
  return new Promise((resolve, reject) => {
    const tableName = tools.PascalToUnderscore(modelName);
    console.log('Discovering schema from ' + databaseName + ' for model: ' + modelName);
    datasources[databaseName].discoverSchema(tableName, function (err, schema) {
      if (err) {
        throw new Error('Unable to access database: ' + databaseName);
      } else {
        for (let property of Object.keys(schema.properties)) {
          // change property name from camelCased to underscore_separated
          if (tools.CamelToUnderscore(property) !== property) {
            schema.properties[tools.CamelToUnderscore(property)] = schema.properties[property];
            delete schema.properties[property];
            property = tools.CamelToUnderscore(property);
          }
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

async function addHandler(databaseName, modelNames) {
  const modelConfigObject = await tools.readConfigFile();
  // discover databases
  const modelDefinitionArray = await discoverDatabaseModels(databaseName);
  for (const modelDefinition of modelDefinitionArray) {
    const modelNameFromDatabase = tools.UnderscoreToPascal(modelDefinition.name);
      // Only update requested models unless user wants to add all models
    if (!modelNames.includes(modelNameFromDatabase) && !commander.all) {
      continue;
    }
    // model already exists
    if (app.models[modelNameFromDatabase]) {
      console.log(modelNameFromDatabase + ' already exists, use update command, continuing to next model');
      continue;
    } else {
      const newModel = await createModel(modelNameFromDatabase, databaseName);
      // add model to model-config
      modelConfigObject[modelNameFromDatabase] = {dataSource: databaseName, public: true};
      console.log(modelNameFromDatabase + ' added to model-config file');
      tools.writeModelFile(newModel);
    }
  }
  // write model-config file
  tools.writeConfigFile(modelConfigObject);
}

commander
  .option('-a --all', 'adds all models')
  .parse(process.argv);

const databaseName = commander.args[0];
const modelNames = commander.args.slice(1);

  // argument checking
if (!Object.keys(datasources).includes(databaseName)) {
  throw new Error(databaseName + ' is not a valid datasource');
}

if (modelNames.length === 0 && !commander.all) {
  throw new Error('Provide the names of models to be updated');
}

addHandler(databaseName, modelNames);


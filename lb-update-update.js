#!/usr/bin/env node
'use strict';

const app = require('server/server');
const datasources = app.datasources;
const commander = require('commander');
const defaultProperties = ['type', 'required', 'length', 'id'];
const tools = require('./tools');

function defaultReplace(originalModel, databaseName) {
  let tableName;

  // check if tablename is defined in model
  if (originalModel.mysql)
    tableName = originalModel.mysql.table;
  else if (originalModel.options.mysql)
    tableName = originalModel.options.mysql.table;
  // if not, use underscore format
  else
    tableName = tools.PascalToUnderscore(originalModel.name);

  console.log('Database table name found: ' + tableName);

  return new Promise((resolve, reject) => {
    datasources[databaseName].discoverSchema(tableName, function (err, schema) {
      if (err) {
        throw new Error(tableName + ' does not exist in database ' + databaseName);
      } else {
        // Go through properties in schema
        for (let property of Object.keys(schema.properties)) {
          // change property name from camelCased to underscore_separated
          if (tools.CamelToUnderscore(property) !== property) {
            schema.properties[tools.CamelToUnderscore(property)] = schema.properties[property];
            delete schema.properties[property];
            property = tools.CamelToUnderscore(property);
          }
          // create properties that don't exist in model
          if (!originalModel.properties[property]) {
            originalModel.properties[property] = {};
          }
          for (const setting of Object.keys(schema.properties[property])) {
            // if the property settings are already the same, don't update
            if ((defaultProperties.includes(setting) || commander.properties) &&
                originalModel.properties[property][setting] !== schema.properties[property][setting]) {
              originalModel.properties[property][setting] = schema.properties[property][setting];
              console.log('Updated model: ' + originalModel.name + ', Property: ' + property + ', Setting: ' + setting);
            }
          }
        }
        // delete properties not in database
        for (const property of Object.keys(originalModel.properties)) {
          if (!Object.keys(schema.properties).includes(property)) {
            console.log('Deleted property ' + property + ' of model ' + originalModel.name);
            delete originalModel.properties[property];
          }
        }
        resolve(originalModel);
      }
    });
  });
}

async function updateHandler(databaseName, modelNames) {
  if (commander.all) {
    for (const modelName of Object.keys(app.models)) {
      // model has to use datasource databaseName or it won't update
      if (app.models[modelName].config.dataSource.name === databaseName) {
        const originalModels = await tools.readModelFile(modelName);
        const newModel = await defaultReplace(originalModels, databaseName);
        tools.writeModelFile(newModel);
      }
    }
  } else {
    for (const modelName of modelNames) {
      const originalModels = await tools.readModelFile(modelName);
      const newModel = await defaultReplace(originalModels, databaseName);
      tools.writeModelFile(newModel);
    }
  }
}

commander
  .option('-a --all', 'updates all models')
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

updateHandler(databaseName, modelNames);

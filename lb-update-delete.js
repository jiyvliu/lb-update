#!/usr/bin/env node
'use strict';

const path = require('path');
const pkag = require('./package.json');
const app = require(path.join(pkag._where, 'server/server'));
const datasources = app.datasources;
const fs = require('fs');
const commander = require('commander');
const defaultProperties = ['type', 'required', 'length', 'id'];
const standard_input = process.stdin;
standard_input.setEncoding('utf-8');
const tools = require('./tools');

function deleteFile(modelName) {
  return new Promise((resolve, reject) => {
    const fileName = tools.PascalToHyphen(modelName);
    fs.unlink('common/models/' + fileName + '.json', (err) => {
      if (err) throw new Error('Could not delete model file ' + fileName + '.json');
    });
    fs.unlink('common/models/' + fileName + '.js', (err) => {
      // there isn't always a .js file
      if (err) console.error('Could not delete or could not find model file ' + fileName + '.js');
    });
    resolve();
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

async function deleteHandler(databaseName) {
  console.log('The -d --delete option will delete models that have the datasource of the database but does not exist in the database. Continue?');
  standard_input.on('data', async function(data) {
    if (data.toString().trim() === 'yes' || data.toString().trim() === 'y') {
      const modelConfigObject = await tools.readConfigFile();
        // discover databases
      const modelDefinitionArray = await discoverDatabaseModels(databaseName);
      const modelNamesFromDatabase = [];
      for (const rowPacket of modelDefinitionArray) {
        modelNamesFromDatabase.push(tools.UnderscoreToPascal(rowPacket.name));
      }
      for (const modelName of Object.keys(app.models)) {
          // model doesn't exist in database and the model has datasource databaseName
        if (!modelNamesFromDatabase.includes(modelName) && app.models[modelName].config.dataSource.name === databaseName) {
          console.log('Deleting model ' + modelName);
          await deleteFile(modelName);
          delete modelConfigObject[modelName];
        }
      }
      tools.writeConfigFile(modelConfigObject);
    } else {
      console.log('Exiting');
      process.exitCode = 0;
    }
  });
}

commander
  .parse(process.argv);

const databaseName = commander.args[0];
// argument checking
if (!Object.keys(datasources).includes(databaseName)) {
  throw new Error(databaseName + ' is not a valid datasource');
}

deleteHandler(databaseName);

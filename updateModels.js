'use strict';

const app = require('./server/server');
const datasource = app.datasources.mysqldb;
const fs = require('fs');
const commander = require('commander');

function readFile(modelName) {
  // check if file exists
  fs.access('common/models/' + modelName + '.json', fs.F_OK, (err) => {
    // create the model if it doesn't exist
    if (err)
      createModel(modelName);
    // read and parse the model if it exists
    else {
      fs.readFile('common/models/' + modelName + '.json', (err, buffer) => {
        if (err) throw err;
        replaceProperties(JSON.parse(buffer));
      });
    }
  });
}

function createModel(modelName) {
  datasource.discoverSchema(modelName, function (err, schema) {
    if (err) throw err;
    writeFile(schema);
  });
}

function replaceProperties(data) {
  let tableName;

  if (data.mysql)
    tableName = data.mysql.table;
  else
    tableName = data.name;

  datasource.discoverSchema(tableName, function (err, schema) {
    if (err) throw err;

    let d_prop = data.properties;
    let s_prop = schema.properties;

    // delete properties not in schema
    for (const column of Object.keys(d_prop)) {
      if (!s_prop[column]) {
        delete d_prop[column];
        console.log('Deleted ' + column);
      }
    }

    // add properties not in model
    for (const column of Object.keys(s_prop)) {
      if (!d_prop[column]) {
        d_prop[column] = s_prop[column];
        console.log('Added ' + column);
      } else {
        // only replace property details that already exist
        for (const property of Object.keys(s_prop[column])) {
          if (commander.properties) {
            d_prop[column] = s_prop[column];
          } else if (d_prop[column][property]) {
            d_prop[column][property] = s_prop[column][property];
            console.log('Updated ' + column + '.' + property);
          }
        }
      }
    }
    writeFile(data);
  });
}

function DeleteExtraModels() {
  datasource.discoverModelDefinitions({schema: datasource.settings.database}, (err, result) => {
    if (err) throw err;
  });
}

function writeFile(model) {
  fs.writeFileSync('common/models/' + model.name + '.json', JSON.stringify(model, null, 2));
  console.log('-------------------------------');
  console.log('Model JSON file update complete');
}

commander
  .description('An npm module to automatically update Loopback models according to schema')
  .arguments('<databaseName> [modelNames...]')
  .option('-u, --update', 'update all models')
  .option('-a, --add [newModel]', 'add new model from database')
  .option('-e, --addEveryModel', 'add all models from the database')
  .option('-p, --properties', 'add only existing properties')
  .option('-d, delete', 'delete models that are not in database')
  .action((modelNames) => {
    if (commander.addEveryModel) {
      datasource.discoverModelDefinitions({schema: datasource.settings.database}, (err, result) => {
        if (err) throw err;
        for (const row in result) {
          if (commander.row);
          readFile(row.name);
        }
      });
    } else {
      for (const model of modelNames) {
        readFile(model);
      }
    }

    if (commander.delete) {
      DeleteExtraModels();
    }
  })
  .parse(process.argv);


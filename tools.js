#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readModelFile(modelName) {
  return new Promise((resolve, reject) => {
    // filenames are in hyphen separated format
    const fileName = PascalToHyphen(modelName);
    fs.readFile('common/models/' + fileName + '.json', 'utf8', (err, buffer) => {
      if (err) {
        throw new Error(fileName + '.json does not exist, use add command to add new models');
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

function CamelToUnderscore(CamelCased) {
  return CamelCased.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function writeModelFile(newModelObject) {
  fs.writeFileSync('common/models/' + PascalToHyphen(newModelObject.name) + '.json', JSON.stringify(newModelObject, null, 2));
  console.log(newModelObject.name + ' JSON file update complete');
  console.log('-------------------------------');
}

function writeConfigFile(modelConfigObject) {
  fs.writeFileSync('./server/model-config.json', JSON.stringify(modelConfigObject, null, 2));
  console.log('model-config.json file update complete');
}

module.exports = {
  readModelFile: readModelFile,
  writeModelFile: writeModelFile,
  readConfigFile: readConfigFile,
  writeConfigFile: writeConfigFile,
  PascalToHyphen: PascalToHyphen,
  PascalToUnderscore: PascalToUnderscore,
  UnderscoreToPascal: UnderscoreToPascal,
  CamelToUnderscore: CamelToUnderscore
};

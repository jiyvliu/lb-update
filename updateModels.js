#!/usr/bin/env node
'use strict';

const commander = require('commander');

commander
  .command('update <databaseName> [modelNames...]', 'update given models with datasource databaseName')
  .command('add <databaseName> [modelNames...]', 'add given models with datasource databaseName')
  .command('delete <databaseName>', 'delete models that use datasource databaseName but no longer exist in that datasource')
  .parse(process.argv);

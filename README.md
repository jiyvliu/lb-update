# lb-update

Script to update and add models through loopback using a mysql database

Naming conventions:

* Database tables: underscore_separated
* Property names: underscore_separated
* Model names: PascalCase
* JSON file names: hyphen-separated

In the future, there will be customizable naming conventions

Update: updates the model.json files of the given models using the database

* -a or --all: updates all models that uses given databaseName

```bash
 lb-update update [options] <databaseName> [modelNames...]
```

Add: adds the model.json files of the given models using the database, also updates the model-config file

* -a or --all: adds all models that uses given databaseName

```bash
lb-update add [options] <databaseName> [modelNames...]
```

Delete: deletes model.json and model.js files that uses the given databaseName but no long exist in the database, also updates the model-config file

```bash
lb-update delete <databaseName> [modelNames...]
```

Currently, update only updates a default set of properties and does not edit properties other than these:

* type
* required
* length
* id

More options and functionality to come in the future

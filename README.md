# lb-update

Script to update and add models through loopback using the database

Naming conventions:

* Database tables: underscore_separated
* Model names: PascalCase
* JSON file names: hyphen-separated

In the future, there will be customizable naming conventions

Usage:

```bash
node updateModels <databaseName> [modelNames...]
```

Options:

* -u or --update: updates all models, does not add new models
* -a or --add: adds models in [modelNames...], does not update
* -e or --addEveryModel: adds all models in database

Currently, update only updates a default set of properties and does not edit properties other than these:

* type
* required
* length
* id

More options and functionality to come in the future

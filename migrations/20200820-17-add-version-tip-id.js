'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * changeColumn "tipId" on table "BlacklistEntries"
 * changeColumn "tipId" on table "Comments"
 * changeColumn "tipId" on table "Retips"
 * changeColumn "id" on table "Tips"
 *
 **/

var info = {
    "revision": 17,
    "name": "add-version-tip-id",
    "created": "2020-08-20T08:22:19.821Z",
    "comment": ""
};

var migrationCommands = function(transaction) {
    return [{
            fn: "changeColumn",
            params: [
                "BlacklistEntries",
                "tipId",
                {
                    "type": Sequelize.STRING,
                    "field": "tipId",
                    "primaryKey": true,
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "Retips",
                "tipId",
                {
                    "type": Sequelize.STRING,
                    "field": "tipId",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "Tips",
                        "key": "id"
                    },
                    "allowNull": true
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
            fn: "changeColumn",
            params: [
                "Tips",
                "id",
                {
                    "type": Sequelize.STRING,
                    "field": "id",
                    "primaryKey": true,
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        }
    ];
};
var rollbackCommands = function(transaction) {
    return [{
            fn: "changeColumn",
            params: [
                "BlacklistEntries",
                "tipId",
                {
                    "type": Sequelize.INTEGER,
                    "field": "tipId",
                    "primaryKey": true,
                    "allowNull": false
                },
                {
                    transaction: transaction
                }
            ]
        },
        {
          fn: "changeColumn",
          params: [
            "Tips",
            "id",
            {
              "type": Sequelize.INTEGER,
              "field": "id",
              "primaryKey": true,
              "allowNull": false
            },
            {
              transaction: transaction
            }
          ]
        },
        {
            fn: "changeColumn",
            params: [
                "Retips",
                "tipId",
                {
                    "type": Sequelize.INTEGER,
                    "field": "tipId",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "Tips",
                        "key": "id"
                    },
                    "allowNull": true
                },
                {
                    transaction: transaction
                }
            ]
        }
    ];
};

module.exports = {
    pos: 0,
    useTransaction: true,
    execute: function(queryInterface, Sequelize, _commands, transaction)
    {
        var index = this.pos;
        function run(transaction) {
            const commands = _commands(transaction);
            return new Promise(function(resolve, reject) {

              function next() {
                if (index < commands.length)
                {
                  let command = commands[index];
                  console.log("[#"+index+"] execute: " + command.fn + " on " + command.params[0]);
                  index++;
                  queryInterface[command.fn].apply(queryInterface, command.params).then(next, reject);
                }
                else
                  resolve();
              }
              next();

            });
        }
        if (this.useTransaction) {
            return run(transaction)
        } else {
            return run(null);
        }
    },
    up: async function(queryInterface, Sequelize)
    {
        const transaction = await queryInterface.sequelize.transaction();

        await this.execute(queryInterface, Sequelize, migrationCommands, transaction);

        console.log("[#3] execute: changeColumn on Comments");

        // DISABLE FK CHECKS
        await queryInterface.sequelize.query("PRAGMA foreign_keys=OFF;", { transaction: transaction });

        // MANUAL MIGRATION FOR COMMENTS DUE TO FK RESTRAINTS
        await queryInterface.sequelize.query("CREATE TABLE IF NOT EXISTS `Comments_backup` (`id` INTEGER PRIMARY KEY, `tipId` VARCHAR(255) NOT NULL, `text` VARCHAR(255) NOT NULL, `author` VARCHAR(255) NOT NULL REFERENCES `Profiles` (`author`), `hidden` TINYINT(1) DEFAULT 0, `signature` VARCHAR(255) NOT NULL, `challenge` VARCHAR(255) NOT NULL, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `parentId` INTEGER REFERENCES `Comments_backup` (`id`), `hierarchyLevel` INTEGER);", { transaction: transaction });
        await queryInterface.sequelize.query("INSERT INTO `Comments_backup` SELECT `id`, `tipId`, `text`, `author`, `hidden`, `signature`, `challenge`, `createdAt`, `updatedAt`, `parentId`, `hierarchyLevel` FROM `Comments`;", { transaction: transaction });
        // SELF REFERENCES ARE NOT SUPPORTED FOR AUTO MIGRATION SO WE NEED TO DELETE ALL FK
        await queryInterface.sequelize.query("UPDATE `Comments` SET `parentId` = NULL;", { transaction: transaction });
        await queryInterface.sequelize.query("DROP TABLE `Comments`;", { transaction: transaction });
        await queryInterface.sequelize.query("CREATE TABLE IF NOT EXISTS `Comments` (`id` INTEGER PRIMARY KEY, `tipId` VARCHAR(255) NOT NULL, `text` VARCHAR(255) NOT NULL, `author` VARCHAR(255) NOT NULL REFERENCES `Profiles` (`author`), `hidden` TINYINT(1) DEFAULT 0, `signature` VARCHAR(255) NOT NULL, `challenge` VARCHAR(255) NOT NULL, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `parentId` INTEGER REFERENCES `Comments` (`id`), `hierarchyLevel` INTEGER);", { transaction: transaction });
        await queryInterface.sequelize.query("INSERT INTO `Comments` SELECT `id`, `tipId`, `text`, `author`, `hidden`, `signature`, `challenge`, `createdAt`, `updatedAt`, `parentId`, `hierarchyLevel` FROM `Comments_backup`;", { transaction: transaction });
        await queryInterface.sequelize.query("DROP TABLE `Comments_backup`;", { transaction: transaction });

        // MODIFY DATA
        await queryInterface.sequelize.query("UPDATE BlacklistEntries SET tipId = tipId || '_v1';", { transaction: transaction });
        await queryInterface.sequelize.query("UPDATE Comments SET tipId = tipId || '_v1';", { transaction: transaction });
        await queryInterface.sequelize.query("UPDATE Tips SET id = id || '_v1';", { transaction: transaction }); // Should cascade
        await queryInterface.sequelize.query("UPDATE Notifications SET entityId = entityId || '_v1' WHERE entityType = 'TIP';", { transaction: transaction });

        // ENABLE FK CHECKS
        await queryInterface.sequelize.query("PRAGMA foreign_keys = ON;", { transaction: transaction });
        return transaction.commit();
    },
    down: async function(queryInterface, Sequelize)
    {
      const transaction = await queryInterface.sequelize.transaction();

      // MANUAL MIGRATION FOR COMMENTS DUE TO FK RESTRAINTS
      await queryInterface.sequelize.query("CREATE TABLE IF NOT EXISTS `Comments_backup` (`id` INTEGER PRIMARY KEY, `tipId` INTEGER NOT NULL, `text` VARCHAR(255) NOT NULL, `author` VARCHAR(255) NOT NULL REFERENCES `Profiles` (`author`), `hidden` TINYINT(1) DEFAULT 0, `signature` VARCHAR(255) NOT NULL, `challenge` VARCHAR(255) NOT NULL, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `parentId` INTEGER REFERENCES `Comments_backup` (`id`), `hierarchyLevel` INTEGER);", { transaction: transaction });
      await queryInterface.sequelize.query("INSERT INTO `Comments_backup` SELECT `id`, `tipId`, `text`, `author`, `hidden`, `signature`, `challenge`, `createdAt`, `updatedAt`, `parentId`, `hierarchyLevel` FROM `Comments`;", { transaction: transaction });
      // SELF REFERENCES ARE NOT SUPPORTED FOR AUTO MIGRATION SO WE NEED TO DELETE ALL FK
      await queryInterface.sequelize.query("UPDATE `Comments` SET `parentId` = NULL;", { transaction: transaction });
      await queryInterface.sequelize.query("DROP TABLE `Comments`;", { transaction: transaction });
      await queryInterface.sequelize.query("CREATE TABLE IF NOT EXISTS `Comments` (`id` INTEGER PRIMARY KEY, `tipId` INTEGER NOT NULL, `text` VARCHAR(255) NOT NULL, `author` VARCHAR(255) NOT NULL REFERENCES `Profiles` (`author`), `hidden` TINYINT(1) DEFAULT 0, `signature` VARCHAR(255) NOT NULL, `challenge` VARCHAR(255) NOT NULL, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL, `parentId` INTEGER REFERENCES `Comments` (`id`), `hierarchyLevel` INTEGER);", { transaction: transaction });
      await queryInterface.sequelize.query("INSERT INTO `Comments` SELECT `id`, `tipId`, `text`, `author`, `hidden`, `signature`, `challenge`, `createdAt`, `updatedAt`, `parentId`, `hierarchyLevel` FROM `Comments_backup`;", { transaction: transaction });
      await queryInterface.sequelize.query("DROP TABLE `Comments_backup`;", { transaction: transaction });

      await queryInterface.sequelize.query("UPDATE BlacklistEntries SET tipId = REPLACE(tipId,'_v1','');", { transaction: transaction });
      await queryInterface.sequelize.query("UPDATE Comments SET tipId = REPLACE(tipId,'_v1','');", { transaction: transaction });
      await queryInterface.sequelize.query("UPDATE Tips SET id = REPLACE(id,'_v1','');", { transaction: transaction });
      await queryInterface.sequelize.query("UPDATE Notifications SET entityId = REPLACE(entityId,'_v1','') WHERE entityType = 'TIP';", { transaction: transaction });

      return this.execute(queryInterface, Sequelize, rollbackCommands, transaction);
    },
    info: info
};

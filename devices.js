module.exports = function(sequelize, DataTypes) {
  var Device = sequelize.define('dispositivos',
  {
    maquina: {
      type: DataTypes.STRING,
      field: 'maquina'
    },
    password:
    {
      type: DataTypes.STRING,
      field: 'Clave'
    },

    descripcion:
    {
      type: DataTypes.STRING,
      field: 'Descripcion'
    },
    id_espacio:
    {    type: DataTypes.INTEGER,
        field: 'ID_espacio'
    },

    activo:
    {    type: DataTypes.INTEGER,
        field: 'Activo'
    },

    licencia:
    {    type: DataTypes.INTEGER,
        field: 'Licencia'
    }
  },

  {
    freezeTableName: true // Model tableName will be the same as the model name
  }

  );

  return Device;
};

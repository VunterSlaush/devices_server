var express = require('express');
var app = express();
var bodyParser = require('body-parser')

var server = require('http').createServer(app).listen((process.env.PORT || 5000));
var io = require('socket.io')(server, {'pingInterval': 2000, 'pingTimeout': 5000}); // con esto detecta <--

var Sequelize = require('sequelize');
var sockets = []; // Lista de sockets

var config = require('./config.json');

var sequelize = new Sequelize(config.database_name, config.user, config.passwd, {
  host: 'sql3.freemysqlhosting.net',
  dialect: 'mysql',

  define: {
    timestamps: false // true by default
  },
   logging: false,
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  }
});

var Device = require('./devices.js')(sequelize, Sequelize);


app.set('superSecret', 'mmm');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));



app.get('/', function(req, res)
{
  res.sendFile(__dirname + '/index.html');
});


io.sockets.on('connection', function(socket)//TODO agregar Autenticacion de dashboard!
{
    console.log("client connected: " + socket.id);

    socket.emit('get_type');

    socket.on('type',function(type)
    {
      var index = buscarSocket(socket.id);
      socket.type = type;
      if (index == -1)
        sockets.push(socket);
      console.log('Cantidad de Sockets:'+sockets.length);
    });

    socket.on('auth_device', function (data) // Aqui simulamos AUTH !
    {
      var username = data.username;
      var password = data.password;
      Device.findOne({where: {maquina: username, password:password}})
            .then(function(device)
            {
              if(device != null && isValid(device))
              {
                socket.id = device.maquina;
                socket.status = false;
                //Device.update({activo:1}, { where:{maquina:device.maquina}});
                socket.emit('loggedIn',{login:true});
                notificarDashboards();
              }
              else
              {
                socket.emit('loggedIn',{login:false});
              }
            });
    });

    socket.on('devices',function()
    {
      Device.findAll().then(function (devices)
      {
        if(devices != null)
        {
          devices_list = [];
          for(var i = 0; i<devices.length; i++)
          {
            var index = buscarSocket(devices[i].maquina);
            if(index != -1)
              devices_list.push({device:devices[i], status:sockets[index].status});
            else
              devices_list.push({device:devices[i], status:null});
          }
          socket.emit('devices_list',{devices:devices_list});
        }

      });
    });

    socket.on('open',function(id)
    {
      var index = buscarSocket(id);
      if(index > -1)
      {
        sockets[index].emit('open');
        sockets[index].status = true;
        indicarCambioDeStatus(sockets[index]);
      }
      else
      {
        socket.status = true;
        indicarCambioDeStatus(socket);
      }
    });

    socket.on('close',function(id)
    {

      var index = buscarSocket(id);
      if(index > -1)
      {
        sockets[index].emit('close');
        sockets[index].status = false;
        indicarCambioDeStatus(sockets[index]);
      }
      else
      {
        socket.status = false;
        indicarCambioDeStatus(socket);
      }
    });

    socket.on('disconnect', function()
    {
      removerSocket(socket.id);
      console.log('Cantidad de Sockets:'+sockets.length);
    });
});

function removerSocket(id)
{
  var index = buscarSocket(id);

  if (index > -1)
  {

    if(sockets[index].type == 'device')
    {
      notificarDashboards();
      Device.update({licencia:0}, { where:{maquina:sockets[index].id}});
    }

    sockets.splice(index, 1);
  }
}

function buscarSocket(id)
{
  for (var i = 0; i < sockets.length; i++) {
    if(sockets[i].id == id)
      return i;
  }
  return -1;
}

function indicarCambioDeStatus(socket)
{
  for (var i = 0; i < sockets.length; i++)
  {
    if(sockets[i].type == 'dashboard')
      sockets[i].emit('status_changed',{maquina:socket.id, status: socket.status});
  }
}

function notificarDashboards()
{
  for (var i = 0; i < sockets.length; i++)
  {
    if(sockets[i].type == 'dashboard')
      sockets[i].emit('devices_changed');
  }
}

function isValid(device)
{
    return (device.licencia == 1) || buscarSocket(device.maquina) == -1;
}

// Dependencies
const express = require('express');
const http = require('http');
const soc = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 5000;

const app = express();
const httpServer = http.createServer(app);
const io = soc(httpServer);

httpServer.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

app.use(express.static(path.join(__dirname, 'public')));

let spots = {left: 0, right: 0};

io.on('connection', socket => {
    let id = socket.id;
    console.log(`user ${id} connected...`);
    
    if(spots.left && spots.right){
        socket.disconnect();
    }
    if(!spots.left){
        spots.left = id;
        socket.emit('availiable side', 'l');
        console.log(`Left Side Claimed by ${id}`);
    }else if(!spots.right) {
        spots.right = id;
        socket.emit('availiable side', 'r');
        console.log(`Right Side Claimed by ${id}`)
    }

    socket.on('paddle move', y => {
        socket.broadcast.emit('paddle move', y);
    });
    socket.on('hit', ball =>{
        socket.broadcast.emit('hit', ball);
    });
    socket.on('pause', () => {
        //console.log(`${paddle.y}`);
        socket.broadcast.emit('pause');
        socket.emit('pause');
    });
    socket.on('score', (score) => {
        socket.broadcast.emit('score', score);
    });
    socket.on('disconnect', reason => {
        if (spots.left == id){
            spots.left = 0;
            console.log("Left Side Disconnected");
        }else if (spots.right == id){
            spots.right = 0;
            console.log("Right Side Disconnected");
        }
    });
});



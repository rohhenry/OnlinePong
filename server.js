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

class Player{
    constructor(id, ratio, side, delay){
        this.id = id;
        this.ratio = ratio;
        this.side = side; 
        this.delay = delay;
    }
}

class Room {
    constructor(){
        this.name = "";
        this.max_size = 2;
        this.players = [];
    }
    isFull(){
        return this.players.length >= this.max_size;
    }
    addPlayer(player){
        if(!this.isFull()){
            player.side = 'l';
            if(this.players.length == 1){
                player.ratio = this.players[0].ratio;
                player.side = (this.players[0].side == 'l' ? 'r' : 'l');
                console.log(`Player ${player.id} using Ratio: ${player.ratio}`);
            }
            this.players.push(player);
            return true;
        }
        return false;
    }
    removePlayer(id){
        this.players = this.players.filter(p => p.id != id);
    }
}

const room = new Room();

io.on('connection', socket => {
    let id = socket.id;
    console.log(`user ${id} connected...`);

    socket.emit('ready');

    socket.on('nudge', ()=>{
        socket.emit('nudge');
    });
    socket.on('paddle move', y => {
        socket.broadcast.emit('paddle move', y);
    });
    socket.on('hit', ball =>{
        socket.broadcast.emit('hit', ball);
    });
    socket.on('reset', ball =>{
        socket.broadcast.emit('reset', ball);
    });
    socket.on('pause', () => {
        socket.broadcast.emit('pause');
        socket.emit('pause');
    });
    socket.on('resume', ()=>{
        socket.broadcast.emit('resume');
        socket.emit('resume');
    });
    socket.on('score', score => {
        socket.broadcast.emit('score', score);
    });
    socket.on('disconnect', reason => {
        room.removePlayer(id);
        console.log(`Disconnected ${id}`);
        socket.broadcast.emit('disconnected');
    });

    socket.on('info', info => {
        if(room.addPlayer(new Player(id, info.ratio, 'c', info.delay))){
            console.log(`Player ${id} joined`)
            console.log(room.players.length);
            console.log(room.isFull());
            if(room.isFull()){
                console.log("Game Starting");
                const totalDelay = room.players[0].delay + room.players[1].delay;
                socket.emit("start", {delay: totalDelay,  seat: room.players[1]});
                socket.broadcast.emit("start", {delay: totalDelay,  seat: room.players[0]});
                console.log(room.players[0]);
                console.log(room.players[1]);
            }
        }else{
            console.log("No more Room");
            socket.disconnect();
        }
    })
});



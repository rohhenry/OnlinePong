const canvas = document.querySelector("#pong");
const ctx = canvas.getContext('2d');
const absWidth = window.innerWidth;
const absHeight = window.innerHeight;

var ratio = absWidth/absHeight;
var width;
var height;
var midx;
var midy;
var factor;
var delay = 1;

//pulse params
const upper = 255;
const lower = 100;
//emit rate
const rate = 10;
const polling = 1;
//ball
const startingSpeed = 0.01;

class Ball {
    constructor(){
        this.x = midx;
        this.y = midy;
        this.radius = 0.1*height;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 0;
        this.acceleration = startingSpeed/10;
        this.color; 
        this.colorList = [lower, lower, lower];
        this.rates = [3, 2, 1];
        
        socket.on('reset', (ball) => {
            this.x = ball.x + ball.dx*delay;
            this.y = ball.y + ball.dy*delay;
            this.velocityX = ball.dx;
            this.velocityY = ball.dy;
            this.speed = ball.spd;
        });
        socket.on('hit', (ball) => {
            this.x = ball.x + ball.dx*delay;
            this.y = ball.y + ball.dy*delay;    
            this.velocityX = ball.dx;
            this.velocityY = ball.dy;
            this.speed = ball.spd;
        });
    }
    resetBall(){
        this.x = midx;
        this.y = midy;
        this.velocityX = startingSpeed * (Math.random() > 0.5 ? 1 : -1);
        this.velocityY = startingSpeed * (Math.random() - 0.5);
        this.speed = startingSpeed;
        socket.emit('reset',  {x: this.x, y: this.y, dx: this.velocityX, dy: this.velocityY, spd: this.speed});
    }
    emitHit(){
        socket.emit('hit',  {x: this.x, y: this.y, dx: this.velocityX, dy: this.velocityY, spd: this.speed});
    }
}

class Player{
    constructor(name, side, controller){
        this.name = name;
        this.side = side;
        this.controller = controller;
        this.score = 0;
        this.paddle = new Paddle(side);
        
        // listening to the mouse
        if(controller == 'player'){
            let lock = false;
            //setInterval(()=> lock = !lock, rate);
            canvas.addEventListener("mousemove", evt => {
                let rect = canvas.getBoundingClientRect();
                this.paddle.y = (evt.clientY-rect.top)/absHeight - this.paddle.height/2;
                //if(!lock){
                    //}
            });
        //}else if(controller == 'opponent'){
        }else if (controller == 'opponent'){
            socket.on('paddle move', y => this.paddle.y = y);
        }
    }
}

class Paddle {
    constructor(side){
        this.width = 0.04*width;
        this.height = 0.3*height;
        if(side == "l"){
            this.x = 0;
            this.rates = [0, 0, 5]
        }else {
            this.x = 1-this.width;
            this.rates = [5, 0, 0];
        }
        this.y = this.height/2;
        this.color; 
        this.colorList = [lower, lower, lower];
    }
}

function pulse(x){
    let s = "#";
    for(let i=0; i<3; i++){
        if(x.colorList[i] + x.rates[i] > upper || x.colorList[i] + x.rates[i] < lower){
            x.rates[i] *= -1;
        }
        x.colorList[i] += x.rates[i];
        if(x.colorList[i] < 16){
            s += "0" + x.colorList[i].toString(16);
        }else{
            s += x.colorList[i].toString(16);
        }
    }
    x.color = s;
}

// draw a rectangle, will be used to draw paddles
function drawRect(x, y, w, h, color){
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

// draw circle, will be used to draw the ball
function drawArc(x, y, r, color){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2,true);
    ctx.closePath();
    ctx.fill();
}

function drawText(text,size,x,y){
    ctx.fillStyle = "#FFF";
    ctx.font = `${size/factor}px Arial`;
    ctx.fillText(text, x, y);
}

// collision detection
function collision(b,p){
    p.top = p.y;
    p.bottom = p.y + p.height;
    p.left = p.x;
    p.right = p.x + p.width;
    
    b.top = b.y - b.radius;
    b.bottom = b.y + b.radius;
    b.left = b.x - b.radius;
    b.right = b.x + b.radius;
    
    return p.left < b.right && p.top < b.bottom && p.right > b.left && p.bottom > b.top;
}

// update function, the function that does all calculations
//function 

// render function, the function that does al the drawing

class Renderer{
    constructor(game){  
        canvas.width = width*factor;
        canvas.height = height*factor;
        this.game = game;
        this.ball = game.ball;
        this.playerleft = game.p1;
        this.playerright = game.p2;
        this.paddleleft = game.p1.paddle;
        this.paddleright = game.p2.paddle;
    }
    render(){
        pulse(this.ball);
        pulse(this.paddleleft); 
        pulse(this.paddleright);
        // clear the canvas
        drawRect(0, 0, width, height, "rgba(0,0,0,1)");
        
        // draw the user score to the left
        drawText(this.playerleft.score,12,0.25, midy);
        
        // draw the COM score to the right
        drawText(this.playerright.score,12, 0.75, midy);
            
        // draw the net
        //drawNet();
        
        // draw the user's paddle
        drawRect(this.paddleleft.x, this.paddleleft.y, this.paddleleft.width, this.paddleleft.height, this.paddleleft.color);
        
        // draw the COM's paddle
        drawRect(this.paddleright.x, this.paddleright.y, this.paddleright.width, this.paddleright.height, this.paddleright.color);
        
        // draw the ball
        drawArc(this.ball.x, this.ball.y, this.ball.radius, this.ball.color);
    }
}
// function renderCountDown(t){
//     interval = setInterval(()=>{
//         if(t){
//             //clearInterval(interval);
//             this.paused = false;
//         }
//         drawText(t, canvas.width/2, canvas.height/2);
//         t--;
//     },1000);
// }

class Game {
    constructor(seat){
        this.fps = 60;
        this.paused = false;
        this.frames = 0;

        this.side = seat.side;
        ratio = seat.ratio;
        // 
        width = 1;
        height = width/ratio;
        midx = width*0.5;
        midy = height*0.5;
        factor = Math.min(absWidth/width, absHeight/height);
    
        this.p1 = new Player('p1', 'l', this.side == 'l' ? 'player' : 'opponent');
        this.p2 = new Player('p2', 'r', this.side == 'r' ? 'player' : 'opponent');
        this.ball = new Ball();
        this.user = this.p1.paddle;
        this.com = this.p2.paddle;
        this.renderer = new Renderer(this);
        ctx.scale(factor, factor);
        this.renderer.render();   
    }

    tick(){
        // if(!this.paused) {
            this.renderer.render();   
            this.update(); 
            if(!this.paused) window.requestAnimationFrame(()=>this.tick());
        // }
    }

    update(){
        if (this.frames == 3){
            if(this.p1.controller == "player"){
                socket.emit('paddle move', this.p1.paddle.y);
            } else {
                socket.emit('paddle move', this.p2.paddle.y);
            }
            this.frames = 0;
            //this.ball.emitHit();
        }
        this.frames++;
        //if scored on emit the point and reset the ball
        if(this.ball.x - this.ball.radius < 0){
            if(this.p1.controller == 'player'){
                this.p2.score++;
                socket.emit('score', [this.p1.score, this.p2.score]);
                this.ball.resetBall();
            } 
        }else if(this.ball.x + this.ball.radius > 1){
            if(this.p2.controller == 'player') {
                this.p1.score++;
                socket.emit('score', [this.p1.score, this.p2.score]);
                this.ball.resetBall();
            }
        }

        if(this.p1.score == 3 || this.p2.score === 3){
            //this.game_over = true;
            //this.pause();

            // this.p1.score = 0;
            // this.p2.score = 0;
        }
    
        
        // the this.ball has a velocity
        this.ball.x += this.ball.velocityX;
        this.ball.y += this.ball.velocityY;
        
        // computer plays for itself, and we must be able to beat it
        // simple AI
        //user.y += ((this.ball.y - (user.y + user.height/2)))*0.1;
        //com.y += ((this.ball.y - (com.y + com.height/2)))*0.05;
        
        // when the this.ball collides with bottom and top walls we inverse the y velocity.
        if(this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > height){
            if(this.ball.velocityY < 0){
                this.ball.y = this.ball.radius;
            }else{
                this.ball.y = height-this.ball.radius;
            }
            this.ball.velocityY = -(this.ball.velocityY);
            //wall.play();
        }
        
        // returns the paddle of the side the this.ball is on
        let closer = (this.ball.x  < midx) ? this.p1 : this.p2;
        
        // if the this.ball hits a paddle
        if(collision(this.ball,closer.paddle)){
            // we check where the this.ball hits the paddle
            let collidePoint = (this.ball.y - (closer.paddle.y + closer.paddle.height/2));
            // normalize the value of collidePoint, we need to get numbers between -1 and 1.
            // -closePaddle.height/2 < collide Point < closePaddle.height/2
            collidePoint = collidePoint / (closer.paddle.height/2);
            
            // when the this.ball hits the top of a paddle we want the this.ball, to take a -45degees angle
            // when the this.ball hits the center of the paddle we want the this.ball to take a 0degrees angle
            // when the this.ball hits the bottom of the paddle we want the this.ball to take a 45degrees
            // Math.PI/4 = 45degrees
            let angleRad = (Math.PI/4) * collidePoint;
            
            // change the X and Y velocity direction
            let direction = (this.ball.x + this.ball.radius < midx) ? 1 : -1;
            this.ball.velocityX = direction * this.ball.speed * Math.cos(angleRad);
            this.ball.velocityY = this.ball.speed * Math.sin(angleRad);
            
            // speed up the this.ball everytime a paddle hits it.
            this.ball.speed += this.ball.acceleration;

            if(closer.controller == 'player') this.ball.emitHit();
        }
    }

    pause(){
        //drawText('PAUSED', 12, 0.5, 0.5);
        this.paused = true;
        //clearInterval(this.gameloop);    
    }
    resume(){
        this.paused = false;
        //this.gameloop = setInterval(() => this.tick(),1000/this.fps);
        window.requestAnimationFrame(()=>this.tick());
    }

    keydownHandler(evt) {
        if (evt.keyCode === 32){
            if(this.game.paused){
                socket.emit('resume');
            }else{
                socket.emit('pause');
            }
        } 
    }

    init(){
       // this.gameloop = setInterval(() => this.tick(),1000/this.fps);
        this.pause();
        window.requestAnimationFrame(()=>this.tick());
        //drawText("Paused Press SPACE to start", 0.1*height, 0.3*width, 0.5*height);

        window.addEventListener("keydown", this.keydownHandler);
        
        socket.on('pause', ()=>this.pause());
        socket.on('resume', ()=>this.resume());
        socket.on('score', score => {
            this.p1.score = score[0];
            this.p2.score = score[1];
        });

        if(this.p1.controller == 'player') this.ball.resetBall();
    }

    terminate(){
        window.removeEventListener('keydown', this.keydownHandler);

        socket.off('score');
        socket.off('pause');
        socket.off('resume');
        
    }

    // start(){
    //     renderCountDown.bin)d(this)(3);
    // }
}


function calculateDelay(n){
    let startTimes = [];
    let delays = [];
    let overhead = Date.now();
    for(i = 0; i < n; i++){
        startTimes.push(Date.now());
        socket.emit('nudge');
    }
    overhead = Date.now() - overhead;
    // console.log(`overhead: ${overhead}ms`);
    socket.on('nudge', ()=>{
        delays.push(Date.now()-startTimes.shift());
        if(delays.length==n){
            delay = (60 * (delays.reduce((a, b) => a + b)-2*overhead)/ (delays.length * 1000 * 2));
            socket.emit('info', {delay: delay, ratio: ratio});
            console.log(delays);
        }
    });
}

const socket = io();
var game;
var div;

socket.on('ready', () =>{
    div = document.querySelector('div') 
    div.innerHTML = "WAITING FOR PLAYER 2";
    
    calculateDelay(1);
    socket.on('start', info => {
        div.innerHTML = "";
        console.log(`Starting ${info.seat.side} Side`);
        delay = Math.round(info.delay);
        console.log(`Delay of ${delay} frames`);
        game = new Game(info.seat);
        game.init();
    });
});

socket.on('disconnected', () => {
    game.pause();
    game.terminate();
    div.innerHTML = "Opponent Left";
});





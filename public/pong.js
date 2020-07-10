const canvas = document.querySelector("#pong");
const ctx = canvas.getContext('2d');
const height = window.innerWidth;
const width = window.innerHeight;
const ratio = width/height;
canvas.width  = height;
canvas.height = width;

//pulse params
const upper = 255;
const lower = 100;
const rate = 50;
const startingSpeed = canvas.width/80;

class Ball {
    constructor(){
        this.x = canvas.width/2;
        this.y = canvas.height/2;
        this.radius = canvas.height/10;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 0;
        this.color; 
        this.colorList = [lower, lower, lower];
        this.rates = [1, 2, 3];
    }
    resetBall(){
        this.x = canvas.width/2;
        this.y = canvas.height/2;
        this.velocityX = startingSpeed * (Math.random() > 0.5 ? 1 : -1);
        this.velocityY = startingSpeed * (Math.random() - 0.5);
        this.speed = startingSpeed;
        //socket.emit('hit', {x: this.x, y: this.y, dx: this.velocityX, dy: this.velocityY, spd: this.speed});
        socket.emit('hit', this.getRelative());
    }
    getRelative(){
        return {x: this.x/width, y: this.y/height, dx: this.velocityX/width, dy: this.velocityY/width, spd: this.speed/(width*height)}
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
            canvas.addEventListener("mousemove", evt => {
                let rect = canvas.getBoundingClientRect();
                this.paddle.y = evt.clientY - rect.top - this.paddle.height/2;
                if(!lock) socket.emit('paddle move', this.paddle.y);
                setInterval(()=> lock = !lock, rate);
            });
        //}else if(controller == 'opponent'){
        }else if (controller == 'opponent'){
            socket.on('paddle move', y => this.paddle.y = y);
        }
    }
}

class Paddle {
    constructor(side){
        this.width = canvas.width/50;
        this.height = canvas.height/3;
        if(side == "l"){
            this.x = 0;
            this.rates = [0, 0, 5]
        }else {
            this.x = canvas.width - this.width;
            this.rates = [5, 0, 0];
        }
        this.y = (canvas.height-this.height)/2;
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

function drawText(text,x,y){
    ctx.fillStyle = "#FFF";
    ctx.font = "50px fantasy";
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

function renderGame(p1, p2, user, com, ball){
    pulse(ball);
    pulse(user);
    pulse(com);
    // clear the canvas
    drawRect(0, 0, canvas.width, canvas.height, "rgba(0,0,0,0.3)");
    
    // draw the user score to the left
    drawText(p1.score,canvas.width/4,canvas.height/5);
    
    // draw the COM score to the right
    drawText(p2.score,3*canvas.width/4,canvas.height/5);

    drawText("Space = Pause", canvas.width/2, canvas.height - 20);
    
    // draw the net
    //drawNet();
    
    // draw the user's paddle
    drawRect(user.x, user.y, user.width, user.height, user.color);
    
    // draw the COM's paddle
    drawRect(com.x, com.y, com.width, com.height, com.color);
    
    // draw the ball
    drawArc(ball.x, ball.y, ball.radius, ball.color);
}

class Game {
    constructor(side){
        this.fps = 60;
        this.paused = true;
        this.p1 = new Player('p1', 'l', side == 'l' ? 'player' : 'opponent');
        this.p2 = new Player('p2', 'r', side == 'r' ? 'player' : 'opponent');
        this.ball = new Ball();
        this.user = this.p1.paddle;
        this.com = this.p2.paddle;
        renderGame(this.p1, this.p2, this.user, this.com, this.ball);   
    }

    tick(){
        if(!this.paused) {
            renderGame(this.p1, this.p2, this.user, this.com, this.ball);   
            this.update(); 
        }else{
            ctx.textBaseLine = 'middle';
            ctx.textAlign = 'center';
            drawText("PAUSED", canvas.width/2, canvas.height/2)
        }
    }

    update(){
        if( this.ball.x - this.ball.radius < 0 ){
            if(this.p1.controller == 'player'){
                this.p2.score++;
                socket.emit('score', 'r');
                this.ball.resetBall();
            } 
        }else if( this.ball.x + this.ball.radius > canvas.width){
            if(this.p1.controller == 'player') {
                this.p1.score++;
                socket.emit('score', 'l');
                this.ball.resetBall();
            }
        }

        if(this.p1.score == 3 || this.p2.score === 3){
            this.game_over = true;
            this.pause();

            this.p1.score = 0;
            this.p2.score = 0;
        }
    
        
        // the this.ball has a velocity
        this.ball.x += this.ball.velocityX;
        this.ball.y += this.ball.velocityY;
        
        // computer plays for itself, and we must be able to beat it
        // simple AI
        //user.y += ((this.ball.y - (user.y + user.height/2)))*0.1;
        //com.y += ((this.ball.y - (com.y + com.height/2)))*0.05;
        
        // when the this.ball collides with bottom and top walls we inverse the y velocity.
        if(this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > canvas.height){
            this.ball.velocityY = -(this.ball.velocityY);
            //wall.play();
        }
        
        // returns the paddle of the side the this.ball is on
        let closer = (this.ball.x  < canvas.width/2) ? this.p1 : this.p2;
        
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
            let direction = (this.ball.x + this.ball.radius < canvas.width/2) ? 1 : -1;
            this.ball.velocityX = direction * this.ball.speed * Math.cos(angleRad);
            this.ball.velocityY = this.ball.speed * Math.sin(angleRad);
            
            // speed up the this.ball everytime a paddle hits it.
            this.ball.speed += 1;

            if(closer.controller == 'player') socket.emit('hit', this.ball.getRelative());
        }
    }

    pause(){
        if(this.game_over){
            this.game_over = false;
        }
        socket.emit('pause');
    }
    init(){
        setInterval(() => this.tick(),1000/this.fps);
        window.addEventListener("keydown", e => {
            if (e.keyCode === 32){
                this.pause()
            } 
        });
        socket.on('pause', () => {
            this.paused  = !this.paused;
        });
        socket.on('hit', (ball) => {
            this.ball.x = ball.x * width;
            this.ball.y = ball.y * height;
            this.ball.velocityX = ball.dx * width;
            this.ball.velocityY = ball.dy * height;
            this.ball.speed = ball.spd * width * height;
        });
        socket.on('score', side => {
            if(side == this.p1.side){
                this.p1.score++;
            }else{
                this.p2.score++;
            }
        });
        if(this.p1.controller == 'player') this.ball.resetBall();
    }

    // start(){
    //     renderCountDown.bind(this)(3);
    // }
}

const socket = io();

socket.on('availiable side', side => {
    let game = new Game(side);
    console.log(side);
    game.init();
})





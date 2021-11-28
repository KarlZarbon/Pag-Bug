// Pac -Bug
// Made with Phaser 3 itch.io for Game Off 2021


const canvasWidth = 800;
const canvasHeight = 600;
const gameVerticalOffset = 40;
const virusScale = 0.1636;


const config = {
    type: Phaser.AUTO, 
    width: canvasWidth, 
    height: canvasHeight,
    backgroundColor: '#d1d1e0',
    // add the physic system to the game config file
    physics: {
        default: 'arcade',
        arcade: {
            gravity: 0,
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};


/////////////////////////////////////////////////////////// globals ////////////////////////////////////

let player;
let cursors;
let gameOver = false;
let paused = false;
let lung;
const initialScore = 0;
let score = 0;
let maxScore = 0;
let scoreText;
const intialLife = 100;
let life = 0;
let lifeText;
let virusTimer;
let startText;
let pauseKey;
let gameOverGraphics;
let gameOverScreen;
let music;
let hitSound;
let wallExplodeSound;
let playerSound;
let numberVirus = 12;
let initialVirusSpamRate = 2000;
let initialVirusSpeed = 80;
let virusSpamRate = 0;
let virusSpeed = 0;



const introText = `\t\t\t\t\t\t\t\t\t\t\t\tWARNING\n\nAn infection has been detected!!\n\nDefend the body against diseases\nby ingesting all viruses before
they reach the lungs!\n\n\nMove the blue leukocyte using\narrow keys.\n\nPress 'Enter' to start.\n\nPress 'P' to pause the game.\n\nPress 'R' to restart the game.`


// Position and shape of the 3 pink rectangular walls

let stage1 = {
    topLeftX: 70,
    topLeftY: 90,
    columns: 32,
    bottomRightX: 640,
    bottomRightY: 440,
    rows: 20
};


let stage2 = {
    topLeftX: 120,
    topLeftY: 140,
    columns: 27,
    bottomRightX: 540,
    bottomRightY: 340,
    rows: 16
};


let stage3 = {
    topLeftX: 180,
    topLeftY: 190,
    columns: 21,
    bottomRightX: 420,
    bottomRightY: 240,
    rows: 10
};



////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// Phaser game and scene functions ////////////////////////////////////////////////


const game = new Phaser.Game(config);


function preload(){
    this.load.image('pink1', 'assets/pink1.png');
    this.load.image('pink2', 'assets/pink2.png');
    this.load.spritesheet('cell', 'assets/spritesheet.png', { frameWidth: 20, frameHeight: 20 });
    this.load.spritesheet('virus', 'assets/virus.png', { frameWidth: 110, frameHeight: 110 });
    this.load.spritesheet('lung', 'assets/lung.png', { frameWidth: 256, frameHeight: 200 });

    this.load.audio('music', 'assets/Breathing.mp3');
    this.load.audio('hitWall', 'assets/hitHurt.wav');
    this.load.audio('wallExplode', 'assets/explosion.wav');
    this.load.audio('player', 'assets/pickupCoin.wav');
}

function create(){

    // sound
    music = this.sound.add('music', { loop: true });
    hitSound = this.sound.add('hitWall');
    wallExplodeSound = this.sound.add('wallExplode', {volume: 0.2});
    playerSound = this.sound.add('player');

    // reset game values to initial levels
    life = intialLife;
    score = initialScore;
    virusSpamRate = initialVirusSpamRate;
    virusSpeed = initialVirusSpeed;

    //  The score
    lifeText = this.add.text(16, 16, 'life: ' + life, { fontSize: '22px', fill: '#000' });
    scoreText = this.add.text(600, 16, 'score: ' + score, { fontSize: '22px', fill: '#000' });
    this.add.text(320, 5, 'PAC-BUG', { fontSize: '30px', fill: '#990099' });
    
    // reduce the world rectangle and leave top of canvas for score
    this.physics.world.setBounds(0, gameVerticalOffset, canvasWidth, canvasHeight-gameVerticalOffset);
    var rect = this.add.rectangle(0, gameVerticalOffset, canvasWidth    , canvasHeight-gameVerticalOffset, '#000000').setOrigin(0,0);

    var top = this.physics.world.bounds.top;
    var bottom = this.physics.world.bounds.bottom;
    var left = this.physics.world.bounds.left;
    var right = this.physics.world.bounds.right;
    const worldCenterX = (right - left)/2;
    const worldCenterY = (bottom - top)/2;

    // create the 3 pink boxes around the lungs
    platforms = this.physics.add.staticGroup();
    createBox(platforms, stage1);
    createBox(platforms, stage2);
    createBox(platforms, stage3);

    // add lungs
    lung = this.physics.add.staticSprite(worldCenterX, worldCenterY+30, 'lung').setScale(0.5);
    lung.refreshBody()
    
    this.anims.create({
        key: 'lungIdle',
        frames: this.anims.generateFrameNumbers('lung', { start: 0, end: 19 }),
        frameRate: 10,
        repeat: -1
    });

    lung.anims.play('lungIdle', true);
 
    
    // The player and its settings
    player = this.physics.add.sprite(worldCenterX, worldCenterY-50, 'cell');

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('cell', { start: 12, end: 15 }),
        frameRate: 10,
        repeat: -1
    });


    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('cell', { start: 20, end: 23 }),
        frameRate: 10,
        repeat: -1
    });


    this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('cell', { start: 4, end: 7 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('cell', { start: 28, end: 31 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'idle',
        frames: [ { key: 'cell', frame: 28 } ],
        frameRate: 20    
    });


    this.anims.create({
        key: 'virusIdle',
        frames: this.anims.generateFrameNumbers('virus', { start: 0, end: 19 }),
        frameRate: 10,
        repeat: -1
    });

    player.setBounce(0.5);
    player.setCollideWorldBounds(true);
 
    // virus group
    viruses = this.physics.add.group({
        defaultKey: 'virus',
        maxSize: numberVirus,
        createCallback: function (virus) {
            // assign each virus an unique Id??
            virus.setName('virus' + this.getLength() + virus.x + virus.y);
        },
        collideWorldBounds: true
    });

    // timer event that spam new viruses
    virusTimer = this.time.addEvent({
        delay: virusSpamRate,
        loop: true,
        callback: doubleVirus,
        args: [this]
    });


    this.physics.add.collider(viruses,platforms, virusCollideCallBack, null, this);
    this.physics.add.collider(lung,viruses,lungCollideCallBack, null, this);
    this.physics.add.overlap(player, viruses, killVirus, null, this);
    

    // start screen
    var startRect = new Phaser.Geom.Rectangle(150, 100, 500, 420);
    var startGraphics = this.add.graphics({ fillStyle: { color: 0xc653c6 } });
    startGraphics.fillRectShape(startRect);
    startText = this.add.text(200, 150, introText, { fontSize: '22px', fill: '#000' });

    // pause screen
    var pauseRect = new Phaser.Geom.Rectangle(320, 100, 150, 60);
    var pauseGraphics = this.add.graphics({ fillStyle: { color: 0xc653c6 } });
    pauseGraphics.fillRectShape(pauseRect);
    pauseGraphics.setVisible(false);
    let pauseText = this.add.text(340, 120, 'Paused', { fontSize: '28px', fill: '#000' });
    pauseText.setVisible(false);    
    
    // gameOver screen
    var gameOverRect = new Phaser.Geom.Rectangle(150, 100, 500, 250);
    gameOverGraphics = this.add.graphics({ fillStyle: { color: 0xc653c6 } });
    gameOverGraphics.fillRectShape(gameOverRect);
    gameOverGraphics.setVisible(false);
    gameOverText = this.add.text(180, 120, 'Game Over', { fontSize: '28px', fill: '#000' });
    gameOverText.setVisible(false);    
    


    // inputs
    cursors = this.input.keyboard.createCursorKeys();

    let enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enterKey.on('down', (key, event) => {

        if(!gameOver){
        startGraphics.setVisible(false);
        startText.setVisible(false);
        this.physics.resume();
        virusTimer.paused =false;
        music.rate = 1.0;
        music.play();
        }

    });

    let restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    restartKey.on('down', (key, event) => {

        music.stop()
        this.scene.restart();
        gameOver = false;
        
                
    });

    this.input.keyboard.on('keydown-P', (event) => {

        paused = !paused;
        if(paused)
        {
            this.physics.pause();
            virusTimer.paused =true;
            pauseGraphics.setVisible(true).setDepth(1);
            pauseText.setVisible(true).setDepth(2);
            music.pause()    
            lung.anims.pause();

        }
        else{
            this.physics.resume();
            virusTimer.paused =false;
            pauseGraphics.setVisible(false);
            pauseText.setVisible(false);
            music.resume();    
            lung.anims.resume();

        }


    });

    // initial state
    this.physics.pause();
    virusTimer.paused =true;

}


function update(){

    if(gameOver)
         return;

    if(life <= 0)
    {
        gameOver = true;
    }
    if (gameOver)
    {
        this.physics.pause();
        virusTimer.paused =true;
        lung.setTint(0xffffff,0xffffff,0x004d00,0x004d00);
        lung.anims.pause()
        gameOverGraphics.setVisible(true).setDepth(1);
        music.stop();

        let gameOverString = 'Game Over.\n\nYour Score: ' + score;
        if(score > maxScore)
        {
            gameOverString += "\n\nCongratulation you have\nthe highest score!\n\n";
            maxScore = score;
        }
        else{
            gameOverString += "\n\n\n\n";

        }
        gameOverString += "Press 'R' to restart.";
        gameOverText.setText(gameOverString);
        gameOverText.setVisible(true).setDepth(2);
        return;
    }
    const velocityX = 200;
    const velocityY = 200;

    if (cursors.left.isDown)
    {
        player.setVelocityX(-velocityX);
        player.anims.play('left', true);
    }
    else if (cursors.right.isDown)
    {
        player.setVelocityX(velocityX);
        player.anims.play('right', true);
    }
    else 
    {
        player.setVelocityX(0);

    }
    
    
    if (cursors.up.isDown)
    {
        player.setVelocityY(-velocityY);
        player.anims.play('up', true);
    }
    else if(cursors.down.isDown)
    {
        player.setVelocityY(velocityY);
        player.anims.play('down', true);
    }
    else
    {
        player.setVelocityY(0);

    }

    if( cursors.left.isUp
        && cursors.right.isUp
        && cursors.up.isUp
        && cursors.down.isUp)
        {
            player.anims.play('idle');

        }
}
 

/////////////// Collide callbacks/////////////////////////////////////////////////////////

// map that hold virus Id plus extra information about positions, used in callbacks
let activeVirus = new Map();


function lungCollideCallBack(lung, virus)
{
 
    if(!activeVirus.has(virus.name)){
        activeVirus.set(virus.name, {x:virus.x, y:virus.y})
     
    virus.body.velocity.x = 0 
    virus.body.velocity.y = 0
    
    this.time.addEvent({
        delay: 1000,
        loop: false,
        callback: () => { 
            if(!gameOver && virus.body.enable)
            {
                if(activeVirus.has(virus.name))
                {
                    // if virus stayed for more 1s against the lung then reduce life by 10
                    viruses.remove(virus, true)
                    hitSound.play();
                    life -= 10;
                    lifeText.setText('Life: ' + Math.max(life, 0));

                    
                    if (life <=100)
                    {
                        lung.setTint(0xffffff,0xffffff,0x80ff80,0x80ff80);
                        music.rate = 1.5
                    }
                    if (life <=50)
                    {
                        lung.setTint(0xffffff,0xffffff,0x00ff00,0x00ff00);
                        music.rate = 2.0;
                    }

                }
            }            
        },
        
    });
    }
}

function virusCollideCallBack(virus, cube)
{
    if(!activeVirus.has(virus.name)){

        virus.body.velocity.x = 0 
        virus.body.velocity.y = 0
        activeVirus.set(virus.name, {x:cube.x, y:cube.y})
        cube.setTint(0x00ff00);
        let tween =this.tweens.add({
            targets: cube,
            alpha: 0,
            ease: 'Cubic.easeOut',  
            duration: 500,
            repeat: -1,
            yoyo: true
          })
        
        
        this.time.addEvent({
            delay: 2000,
            loop: false,
            callback: () => { 
                if(!gameOver && virus.body.enable){
                    if(activeVirus.has(virus.name))
                    {
                        if(activeVirus.get(virus.name).x == cube.x && activeVirus.get(virus.name).y == cube.y)
                        {
                            // if virus is still alive and is still next to the cube
                            // => delete cube from group
                            cube.disableBody(true, true)
                            wallExplodeSound.play();
                            activeVirus.delete(virus.name)
                            activateVirus(virus, this)

                        }else{
                            tween.stop();
                            cube.clearTint()
                        }
                    }
                    else{
                        tween.stop();
                        cube.clearTint()
                    }    
                }
                else{
                    tween.stop()
                    cube.clearTint()
                }
            },
            
        });
    }
} 


function killVirus (player, virus)
{
    playerSound.play();
    activeVirus.delete(virus.name)
    viruses.remove(virus, true)

    score += 10;
    scoreText.setText('Score: ' + score);

    if (score > 0 && score%100 ==0)
    {
        //accelerate spam rate
        virusSpamRate -= 140;
        virusTimer.delay = Math.max(virusSpamRate, 10);
    }
    if (score > 0 && score%400 ==0)
    {
        //accelerate virus speed
        virusSpeed += 10;
    }
}

// function called after virus creation or after a collision
function activateVirus (virus, scene) {
    virus
    .setActive(true)
    .setVisible(true)
    .setCollideWorldBounds(true)
    .setScale(virusScale)
    .setBounce(0)
    .anims.play('virusIdle', true)
    .body.setEnable(true);
    // set the virus in motion
    scene.physics.moveToObject(virus, lung, virusSpeed);

}

// spam a virus ina random position
function doubleVirus(scene)
{
    let x, y = 0
    let quadran = Math.floor(Math.random() * 4);

    switch(quadran)
    {
        case 0:
            x = Phaser.Math.Between(730, 790);
            y = Phaser.Math.Between(110, 520);
            break;
        
        case 1:
            x = Phaser.Math.Between(75, 690);
            y = Phaser.Math.Between(560, 590);
            break;
            
        case 2:
            x = Phaser.Math.Between(10, 40);
            y = Phaser.Math.Between(110, 520);
            break;
        
        case 3:
            x = Phaser.Math.Between(75, 690);
            y = Phaser.Math.Between(50, 60);
            break;
                        
    }
    
    
    let virus = viruses.get(x, y);
    if(!virus)
        return;
    virus.setTint(Phaser.Display.Color.RandomRGB(100).color)
    activateVirus(virus, scene);
}



// utility function to draw the walls
function createBox(platforms, level){
    for(let j= 0; j < 2; j++){
            
        for(let i = 0; i < level.columns; i+=2){
            platforms.create(level.topLeftX+i*20,level.topLeftY+j*level.bottomRightY,'pink1');
            platforms.create(level.topLeftX+20+i*20,level.topLeftY+j*level.bottomRightY,'pink2');
        }
        platforms.create(level.topLeftX+level.columns*20,level.topLeftY+j*level.bottomRightY,'pink1');
    }   
    for(let i = 0; i < 2; i++){    
        platforms.create(level.topLeftX+i*level.bottomRightX,level.topLeftY+20,'pink2');
        for(let j = 1; j < level.rows; j+=2){
            platforms.create(level.topLeftX+i*level.bottomRightX,level.topLeftY+20+j*20,'pink1');
            platforms.create(level.topLeftX+i*level.bottomRightX,level.topLeftY+40+j*20,'pink2');
        }
    }

}

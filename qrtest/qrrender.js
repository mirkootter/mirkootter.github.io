function Point(x,y) {
    this.x = x;
    this.y = y;
}

function qrCode(size,value=null) {
    var array = new Array(size);
    for(var j=0;j<size;++j) {
        var row = new Array(size);
        for(var i=0;i<size;++i) {
            if(value===null) row[i] = Math.random()<0.5; else row[i] = value;
        }
        array[j] = row;
    }
    
    return array;
}

function create2dBoolArray(width,height) {
    var array = new Array(height);
    for(var j=0;j<height;++j) {
        var row = new Array(width);
        for(var i=0;i<width;++i) row[i] = false;
        array[j] = row;
    }
    return array;
}

// dir: 0=right,1=down,2=left,3=up
function createPath(code,vEdges,x,y,dir) {
    var x0 = x;
    var y0 = y;
    
    var size = code.length;
    
    function ok(i,j) {
        return i>=0 && j>=0 && i<size && j<size && code[j][i];
    }
    
    var path = [new Point(x,y)];
    var __dx = [1,0,-1,0];
    var __dy = [0,1,0,-1];

    do {
        // Richtungvektor bestimmen und ggf vertikale Kante markieren
        var dx = __dx[dir];
        var dy = __dy[dir];
        if(dy<0) vEdges[y-1][x] = true;
        if(dy>0) vEdges[y][x] = true;
        // Einen Schritt bewegen
        x += dx;
        y += dy;
        // Modul bestimmen (Fahrtrichtung rechts)
        var i = x+(dx-dy-1)/2;
        var j = y+(dx+dy-1)/2;
        // Ggf abbiegen
        if(!ok(i,j)) {
            dir = (dir+1)&3; // Im Uhrzeigersinn drehen
        } else if(ok(i+dy,j-dx)) {
            dir = (dir+3)&3; // Gegen den Uhrzeigersinn drehen
        } else continue; // Kein Knick --> Pfad muss noch nicht angepasst werden
        // Pfad anpassen
        path.push(new Point(x,y));
    } while(x != x0 || y != y0);
    
    return path;
}

function renderPath(ctx,width,size,height,path) {
    var scaleX = (width-100)/size;
    var scaleY = (height-100)/size;

    ctx.moveTo(50+path[0].x*scaleX,50+path[0].y*scaleY);
    for(var i=1;i<path.length-1;++i) ctx.lineTo(50+path[i].x*scaleX,50+path[i].y*scaleY);
    ctx.closePath();
}

// dir: true=right; false=down
function Turtle(code,vEdges,x,y,dir=true) {
    var x0 = x;
    var y0 = y;
    
    var dx = dir?1:0;
    var dy = dir?0:1;
    
    var dx0 = dx;
    var dy0 = dy;
    
    var size = code.length;
    
    this.path = [new Point(x+(dir?0:1),y)]; // Dies ist der Punkt unten links der Kröte
    
    function ok(x,y) {
        return x>=0 && y>=0 && x<size && y<size && code[y][x];
    }
    
    function turnLeft() {
        var h = dx;
        dx = dy;
        dy = -h;
    }
    
    function turnRight() {
        var h = dx;
        dx = -dy;
        dy = h;
    }
    
    this.step = function() {
    
        if(dy<0) vEdges[y][x] = true;   // linke Kante
        if(dy>0) vEdges[y][x+1] = true; // rechte Kante

        if(!ok(x+dx,y+dy)) {
            // Sackgasse. Im Uhrzeigersinn drehen (auf der Stelle bleiben)
            turnRight();
            this.path.push(new Point(x+(1-dx+dy)/2,y+(1-dx-dy)/2));
        } else if(!ok(x+dx+dy,y-dx+dy)) {
            // Geradeaus.
            x += dx;
            y += dy;
        } else {
            // Wir können nach links abbiegen
            x += dx+dy;
            y += dy-dx;
            turnLeft();
            this.path.push(new Point(x+(1-dx+dy)/2,y+(1-dx-dy)/2));
        }
        
        return x==x0 && y==y0 && dx==dx0 && dy==dy0; // Wieder bei Startposition ?
    }
    
    this.go = function() {
        while(!this.step());
    }
    
    this.render = function(ctx,width,height) {
        var scaleX = (width-100)/size;
        var scaleY = (height-100)/size;
        
        ctx.moveTo(50+this.path[0].x*scaleX,50+this.path[0].y*scaleY);
        for(var i=1;i<this.path.length-1;++i) ctx.lineTo(50+this.path[i].x*scaleX,50+this.path[i].y*scaleY);
        ctx.closePath();
    }
}

function logBorder(border) {
    console.log("====");
    for(var j=0;j<border.length;++j) {
        var row = border[j];
        var str = "";
        for(var i=0;i<row.length;++i) {
            switch(row[i]) {
                case 0: str += ' ';break;
                case 1: str += '<';break;
                case 2: str += '>';break;
                case 3: str += 'x';break;
                default: str+='!';
            }
        }
        console.log(str);
    }
}

function draw(code) {
    var size = code.length
    var vEdges = create2dBoolArray(code.length+1,code.length);

    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "rgb(102, 204, 0)";
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgb(0, 50, 200)";

    var count = 0;
    for(var j=0;j<size;++j) {
        var inside = false;
        for(var i=0;i<size;++i) {
            var c = code[j][i];
            if(inside != c) {
                // Vertikale Kante gefunden
                inside = !inside;
                
                // Wenn die Kante neu ist, Pfad hinzufügen
                if( !vEdges[j][i] ) {
                    var turtle = new Turtle(code,vEdges,inside?i:(i-1),j,inside);
                    turtle.go();
                    if(!count) ctx.beginPath();
                    turtle.render(ctx,500,500);
                    ++count;
                }
            }
        }
    }
    
    if(count>0) {
        ctx.fill("nonzero");
        ctx.stroke();
    }
}

code = null;

function setup() {
    var canvas = document.getElementById("canvas");
    canvas.onmousedown = canvasMouseDown;
    main();
}

function main(value=null) {
    code = qrCode(20,value);
    
    draw(code);
}

function canvasMouseDown(ev) {
    var x = ev.clientX-ev.target.offsetLeft;
    var y = ev.clientY-ev.target.offsetTop;
    
    var scaleX = (canvas.width-100)/code.length;
    var scaleY = (canvas.height-100)/code.length;
    x = Math.floor((x-50)/scaleX);
    y = Math.floor((y-50)/scaleY);
    
    if(x<0 || y<0 || x>=code.length || y>=code.length) return;
    
    code[y][x] = !code[y][x];
    draw(code);
}

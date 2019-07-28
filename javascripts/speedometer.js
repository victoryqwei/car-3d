var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

function drawSpeedometer() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	// RPMOMETER ----------------------------

	var radius = canvas.height/4-60;
	var pinStart = new Vector(canvas.width/2-radius*2, canvas.height-100);

	// Draw base
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.arc(pinStart.x, pinStart.y, radius, 0, 2*Math.PI);
	ctx.globalAlpha = 0.7;
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.closePath();

	// Draw ticks
	for (var i = -1; i < car.engineRed / 1000; i++) {
		var tickDirection = Vector.rotate(new Vector(-1, 0), (i)*1000/(car.engineRed)*Math.PI*6/7);
		drawLine(pinStart.x + tickDirection.x * radius * 9/10, pinStart.y + tickDirection.y * radius * 9/10, pinStart.x + tickDirection.x * radius, pinStart.y + tickDirection.y * radius, 5, "lime", 1, "round");
		drawText(i+1, pinStart.x + tickDirection.x * radius * 3/4, pinStart.y + tickDirection.y * radius * 3/4, "30px Arial", "lime", "center", "middle");
	}

	ctx.beginPath();
	ctx.arc(pinStart.x, pinStart.y, radius, 0, 2*Math.PI);
	ctx.strokeStyle = "black";
	ctx.lineWidth = 5;
	ctx.stroke();
	ctx.closePath();

	// Draw pin
	var pinDirection = new Vector(-1, 0);
	var pinLength = radius-30;

	pinDirection = Vector.rotate(pinDirection, (car.rpm-1000)/car.engineRed*Math.PI*6/7);
	drawLine(pinStart.x, pinStart.y, pinStart.x + pinDirection.x * pinLength, pinStart.y + pinDirection.y * pinLength, 5, "red", 1, "round");

	// Draw text
	drawText("RPM (x1000)", pinStart.x, pinStart.y+40, "", "lime", "center", "top")
	drawText(Math.round(car.rpm), pinStart.x, pinStart.y-50, "40px Arial", "lime", "center", "top")

	// FUELOMETER ----------------------------

	var radius = canvas.height/4-60;
	var pinStart = new Vector(canvas.width/2+radius*2, canvas.height-100);

	// Draw base
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.arc(pinStart.x, pinStart.y, radius, 0, 2*Math.PI);
	ctx.globalAlpha = 0.7;
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.closePath();

	// Draw ticks
	for (var i = 2; i < car.maxFuel/3 + 3; i++) {
		var tickDirection = Vector.rotate(new Vector(-1, 0), (i)/(car.maxFuel/3)*Math.PI*6/7);
		drawLine(pinStart.x + tickDirection.x * radius * 9/10, pinStart.y + tickDirection.y * radius * 9/10, pinStart.x + tickDirection.x * radius, pinStart.y + tickDirection.y * radius, 5, "lime", 1, "round");
		if (i == 2) {
			drawText("F", pinStart.x + tickDirection.x * radius * 3/4, pinStart.y + tickDirection.y * radius * 3/4, "30px Arial", "lime", "center", "middle");
		} else if (i == car.maxFuel/3 + 2) {
			drawText("E", pinStart.x + tickDirection.x * radius * 3/4, pinStart.y + tickDirection.y * radius * 3/4, "30px Arial", "lime", "center", "middle");
		}
		
	}

	ctx.beginPath();
	ctx.arc(pinStart.x, pinStart.y, radius, 0, 2*Math.PI);
	ctx.strokeStyle = "black";
	ctx.lineWidth = 5;
	ctx.stroke();
	ctx.closePath();

	// Draw pin
	var pinDirection = new Vector(-1, 0);
	var pinLength = radius-30;

	pinDirection = Vector.rotate(pinDirection, (car.maxFuel-(car.fuel)/car.maxFuel)*Math.PI*6/7 - Math.PI*2/7);
	drawLine(pinStart.x, pinStart.y, pinStart.x + pinDirection.x * pinLength, pinStart.y + pinDirection.y * pinLength, 5, "red", 1, "round");

	// Draw text
	drawText("Fuel (gallons)", pinStart.x, pinStart.y+40, "", "lime", "center", "top")
	drawText(Math.round(car.fuel), pinStart.x, pinStart.y-50, "40px Arial", "lime", "center", "top")

	// SPEEDOMETER ----------------------------

	var radius = canvas.height/3-60;
	var pinStart = new Vector(canvas.width/2, canvas.height-100);

	// Draw base
	ctx.fillStyle = "black";
	ctx.beginPath();
	ctx.arc(pinStart.x, pinStart.y, radius, 0, 2*Math.PI);
	ctx.globalCompositeOperation = 'destination-out';
	ctx.fill();
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 0.7;
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.closePath();

	// Draw ticks
	for (var i = -1; i < (car.maxSpeed-40) / 20 + 2; i++) {
		var tickDirection = Vector.rotate(new Vector(-1, 0), i*20/(car.maxSpeed-40)*Math.PI);
		drawLine(pinStart.x + tickDirection.x * radius * 9/10, pinStart.y + tickDirection.y * radius * 9/10, pinStart.x + tickDirection.x * radius, pinStart.y + tickDirection.y * radius, 5, "lime", 1, "round");
		drawText((i+1)*20, pinStart.x + tickDirection.x * radius * 4/5, pinStart.y + tickDirection.y * radius * 4/5, "", "lime", "center", "middle");
		if (i < (car.maxSpeed-40)/20 + 1) {
			var tickDirection = Vector.rotate(new Vector(-1, 0), (i+0.5)*20/(car.maxSpeed-40)*Math.PI);
			drawLine(pinStart.x + tickDirection.x * radius * 19/20, pinStart.y + tickDirection.y * radius * 19/20, pinStart.x + tickDirection.x * radius, pinStart.y + tickDirection.y * radius, 5, "lime", 1, "round");
		}
	}

	ctx.beginPath();
	ctx.arc(pinStart.x, pinStart.y, radius, 0, 2*Math.PI);
	ctx.strokeStyle = "black";
	ctx.lineWidth = 5;
	ctx.stroke();
	ctx.closePath();

	// Draw pin

	var pinDirection = new Vector(-1, 0);
	var pinLength = radius-30;

	pinDirection = Vector.rotate(pinDirection, (Math.clamp(car.speed, 0, car.maxSpeed)-20)/(car.maxSpeed-40)*Math.PI);
	drawLine(pinStart.x, pinStart.y, pinStart.x + pinDirection.x * pinLength, pinStart.y + pinDirection.y * pinLength, 5, "red", 1, "round");

	// Draw text
	drawText("Speed (KM/H)", pinStart.x, pinStart.y+40, "", "lime", "center", "top")
	drawText(Math.clamp(Math.round(car.speed), 0, car.maxSpeed), pinStart.x, pinStart.y-100, "80px Arial", "lime", "center", "top")

}
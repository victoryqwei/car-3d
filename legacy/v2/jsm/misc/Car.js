/**
 * @author alteredq / http://alteredqualia.com/
 * @author Lewy Blue https://github.com/looeee
 *
 * The model is expected to follow real world car proportions. You can try unusual car types
 * but your results may be unexpected. Scaled models are also not supported.
 *
 * Defaults are rough estimates for a real world scale car model
 *
 */

import {
	Box3,
	Group,
	Math as _Math,
	Vector3
} from "../../build/three.module.js";

var Car = ( function ( ) {

	var frontLeftWheelRoot = null;
	var frontRightWheelRoot = null;

	var frontLeftWheel = new Group();
	var frontRightWheel = new Group();
	var backLeftWheel = null;
	var backRightWheel = null;

	var steeringWheel = null;

	var wheelDiameter = 1;
	var length = 1;

	var loaded = false;

	class Car {
		constructor() {
			this.enabled = true;
			this.root = null;

			this.elemNames = {
				flWheel: 'wheel_fl',
				frWheel: 'wheel_fr',
				rlWheel: 'wheel_rl',
				rrWheel: 'wheel_rr',
				steeringWheel: 'steering_wheel', // set to null to disable
			};
			
			// local axes of rotation - these are likely to vary between models
			this.wheelRotationAxis = 'x';
			this.wheelTurnAxis = 'z';
			this.steeringWheelTurnAxis = 'y';

			document.addEventListener( 'keydown', this.onKeyDown, false );
			document.addEventListener( 'keyup', this.onKeyUp, false );

			// Car variables

			this.carAngle = 0;
			this.pos = new Vector(); // Position
			this.velocity = new Vector(); // Velocity
			this.localVelocity = new Vector();
			this.acceleration = new Vector(); // Acceleration
			this.localAcceleration = new Vector();
			this.absVelocity = 0; // Metres / Second
			this.speed = 0; // KM / Hour
			this.imperialSpeed = 0; // Miles per hour
			this.yawRate = 0;
			this.steeringAngle = 0; // Steering angle

			// User inputs

			this.steer = 0;
			this.throttle = 0;
			this.brake = 0;
			this.eBrake = 0;

			// Engine curves (Newton meters)
			this.torqueCurve = new Graph([[0, 0], [1000, 400], [2000, 433], [3000, 450], [4000, 470], [4400, 475], [5000, 430], [5500, 400], [6000, 300], [7000, 0]]) // Corvette C5
			//this.torqueCurve = new Graph([[0, 220], [1000, 220], [4400, 310], [7000, 230]]) // Boxster S

			this.rpm = 0;
			this.engineTorque = 0;
			this.maxTorque = 0;
			this.engineIdle = 1000;
			this.engineRed = 7000;

			// Gear transmission
			this.gear = 1;
			this.gearRatios = {
				"-1": 2.9, // Reverse
				0: 0, // Neutral
				1: 2.66,
				2: 1.78,
				3: 1.3,
				4: 1,
				5: 0.74,
				6: 0.5
			}

			this.differentialRatio = 3.42;
			this.transmissionEfficiency = 0.7;

			// Extra variables
			this.corneringForce = 0;
			this.sideslipAngle = 0;

			// Wheel variables

			this.axleWeightFront = 0;
			this.axleWeightRear = 0;			
			this.wheelRPM = 0;

			// Timer variables

			this.moved = false;
			this.time = Date.now();
			this.stopSpeeds = [50, 100, 150, 200];

			// Set car configs
			this.setConfig();
			this.setControls();
			this.setAudio();
		}

		setConfig(opts) {
			// Configuration of Car

			this.gravity = 9.81; // Meters / Second
			this.mass = 1200 // Kilograms

			// Body
			this.halfWidth = 0.95;
			this.height = 0.55;
			this.cgToFront = 2.25;
			this.cgToRear = 2.25;   // Centre of gravity to rear of chassis
			this.cgToFrontAxle = 1.25;  // Centre gravity to front axle
			this.cgToRearAxle = 1.25;  // Centre gravity to rear axle
			this.wheelBase = this.cgToFrontAxle + this.cgToRearAxle;
			this.cgHeight = 0.55;  // Centre gravity height
			this.wheelRadius = 0.35;  // Includes tire (also represents height of axle)
			this.wheelRotationRate = 0;

			this.w = (this.cgToFront + this.cgToRear);
			this.h = this.halfWidth*2;
			this.boundingBox = {
				tl: new Vector(-this.w/2, -this.h/2),
				br: new Vector(this.w/2, this.h/2)
			}

			// Wheels (with respect to the car position)
			this.wheels = {};
			this.wheels.size = this.w/4
			this.wheels.thickness = this.h/4

			this.wheels.particles = []; // Particles for drifting

			this.tireGrip = 2.0;
			this.lockGrip = 0.7;
			this.driveForce = 8000;
			this.brakeForce = 12000;
			this.eBrakeForce = this.brakeForce / 2.5;
			this.weightTransfer = 1;
			this.maxSteer = 0.5;
			this.cornerStiffnessFront = 5.0;
			this.cornerStiffnessRear = 5.2;

			this.drag = 0.4257; // Air resistance
			this.rrDrag = 12.8 ; // Rolling resistance
		}

		setControls(opts) {
			this.controls = {};

			this.controls.steerLeftPosition = window.innerWidth/2-50;
			this.controls.steerRightPosition = window.innerWidth/2+50;
		}

		setAudio() {
			this.audio = {};
			
			this.audio.engine = new Howl({
			  src: ['audio/engine.wav'],
			  autoplay: true,
			  loop: true,
			  volume: 0
			});
			
		}

		getInputs(dt) {
			var ctrl = this.controls;

			map[37] = map[38] = map[39] = map[40] = false;

			// Throttle position
			if (map[38] || map[87]) {
				this.throttle = Math.min(1, this.throttle + dt);
				this.brake = 0;
			} else {
				this.throttle = Math.max(0, this.throttle - dt * 5);
			}

			// Brake position
			if (map[40] || map[83]) {
				this.brake = 1;
				this.throttle = 0;
			} else {
				this.brake = 0;
			}

			// Emergency brake position
			if (map[32]) {
				this.eBrake = 1;
			} else {
				this.eBrake = 0;
			}

			// Steering angle
			if (useMouse.checked) {
				// Angle based on horizontal mouse position
				if (mouse.x < ctrl.steerLeftPosition)
					this.steeringAngle = (1-mouse.x/ctrl.steerLeftPosition)*this.maxSteer;
				else if (mouse.x >= ctrl.steerLeftPosition && mouse.x < ctrl.steerRightPosition)
					this.steeringAngle = 0;
				else if (mouse.x > ctrl.steerRightPosition)
					this.steeringAngle = -((mouse.x-ctrl.steerRightPosition)/ctrl.steerLeftPosition)*this.maxSteer;
			} else {
				// Arrow / WASD key steering
				if ((map[37] || map[65]) && this.steeringAngle < this.maxSteer) {
					this.steeringAngle += 0.02;
				}
				if ((map[39] || map[68]) && this.steeringAngle > -this.maxSteer) {
					this.steeringAngle -= 0.02;
				}
				if (!(map[37] || map[65]) && !(map[39] || map[68])) {
					if (this.steeringAngle < -0.02) {
						this.steeringAngle += 0.02;
					} else if (this.steeringAngle > 0.02) {
						this.steeringAngle -= 0.02;
					} else {
						this.steeringAngle = 0;
					}
				}
			}

			// Gear shift

			if (map[82])
				this.gear = -1;
			else if (map[78])
				this.gear = 0;
			else if (map[49])
				this.gear = 1;
			else if (map[50])
				this.gear = 2;
			else if (map[51])
				this.gear = 3;
			else if (map[52])
				this.gear = 4;
			else if (map[53])
				this.gear = 5;
			else if (map[54])
				this.gear = 6;
		}

		applyPhysics(dt) {
			// Get car local velocity
			this.localVelocity.x = Math.cos(this.carAngle) * this.velocity.x + Math.sin(this.carAngle) * this.velocity.y;
			this.localVelocity.y = Math.cos(this.carAngle) * this.velocity.y - Math.sin(this.carAngle) * this.velocity.x;

			// Weight on axles based on center of gravity and weight shift due to forward/reverse acceleration
			this.axleWeightFront = this.mass * (0.5 * this.gravity - this.weightTransfer * this.localAcceleration.x * this.height / this.wheelBase);
			this.axleWeightRear = this.mass * (0.5 * this.gravity + this.weightTransfer * this.localAcceleration.x * this.height / this.wheelBase);

			var yawSpeedFront = this.cgToFrontAxle * this.yawRate;
			var yawSpeedRear = -this.cgToRearAxle * this.yawRate;

			// Calculate sideslip angle for car
			this.sideslipAngle = (this.carAngle%rad(360) - this.velocity.getDir())%rad(360);

			// Calculate slip angle for front/back wheel
			this.wheels.slipAngleFront = Math.atan2(this.localVelocity.y + yawSpeedFront, Math.abs(this.localVelocity.x)) - Math.sign(this.localVelocity.x) * this.steeringAngle;
			this.wheels.slipAngleBack = Math.atan2(this.localVelocity.y + yawSpeedRear,  Math.abs(this.localVelocity.x));

			var tireGripFront = this.tireGrip;
			var tireGripRear = this.tireGrip * (1.0 - this.eBrake * (1.0 - this.lockGrip)); // reduce rear grip when ebrake is on

			// Calculate cornering forces for front and rear axle
			var frictionForceFront = Math.clamp(-this.cornerStiffnessFront * this.wheels.slipAngleFront, -tireGripFront, tireGripFront) * this.axleWeightFront;
			var frictionForceRear = Math.clamp(-this.cornerStiffnessRear * this.wheels.slipAngleBack, -tireGripRear, tireGripRear) * this.axleWeightRear;

			// Calculate rpm of engine

			//this.rpm = this.wheelRotationRate * this.gearRatios[this.gear] * this.differentialRatio * 60 / (2 * Math.PI);
			this.rpm = this.localVelocity.x * 60 * this.gearRatios[this.gear] * this.differentialRatio / (2 * Math.PI * this.wheelRadius);
			if (this.gear == 0)
				this.rpm = this.engineIdle + this.throttle * this.engineRed;

			this.wheelRPM = this.wheelRotationRate * 60 / (2 * Math.PI);

			// Move idling car
			/*if (this.rpm < 1000 && this.throttle < 0.7) {
				this.throttle = 0.4;
			}*/

			// Clamp engine rpm to redline
			this.rpm = Math.clamp(this.rpm, this.engineIdle, this.engineRed); // Redline

			// Calculate engine torque
			this.maxTorque = Math.max(this.torqueCurve.interpolate(this.rpm), 0);

			this.engineTorque = this.throttle * this.maxTorque;

			this.driveTorque = this.engineTorque * this.gearRatios[this.gear] * this.differentialRatio/* * this.transmissionEfficiency*/;
			this.driveForce = this.driveTorque / this.wheelRadius;

			if (this.driveForce > this.axleWeightRear) {
				this.driveForce = this.axleWeightRear;
			}
			
			// Automatic transmission
			if (gearSelect.checked && this.gear > 0) {
				var nextGear = this.gear + 1;

				if (this.rpm > 5000 ) {
					this.gear = nextGear;
				}

				/*var lastGear = this.gear - 1;

				if (lastGear > 0 && this.localVelocity.x * 60 * this.gearRatios[lastGear] * this.differentialRatio / (2 * Math.PI * this.wheelRadius) <= 5000) {
					this.gear = lastGear;
				}*/
			}

			// Brake and throttle forces
			var throttle = this.throttle * this.driveForce;
			var brake = Math.min(this.brake * this.brakeForce + this.eBrake * this.eBrakeForce, this.brakeForce);
			if (this.gear === -1)
				brake = -brake;

			// Traction force
			let tractionForce = new Vector(throttle - brake * Math.sign(this.localVelocity.x), 0);

			// Frictional forces
			let dragForce = new Vector(this.localVelocity.x * Math.abs(this.localVelocity.x) * -this.drag, this.localVelocity.y * Math.abs(this.localVelocity.y) * -this.drag); // Air resistance force
			let rollingResistanceForce = new Vector(this.localVelocity.x * -this.rrDrag, this.localVelocity.y * -this.rrDrag); // Rolling resistance force (friction with ground)

			 // Total force applied on car
			let netForce = tractionForce.copy();
			netForce.add(dragForce);
			netForce.add(rollingResistanceForce);

			// Add cornering force as well
			this.corneringForce = Math.cos(this.steeringAngle) * frictionForceFront + frictionForceRear;
			netForce.y += this.corneringForce;

			// Compute acceleration
			this.localAcceleration.x = netForce.x / this.mass;
			if (this.gear === -1)
				this.localAcceleration.x = -this.localAcceleration.x;

			this.localAcceleration.y = netForce.y / this.mass;

			// Convert to global acceleration
			this.acceleration.x = Math.cos(this.carAngle) * this.localAcceleration.x - Math.sin(this.carAngle) * this.localAcceleration.y;
			this.acceleration.y = Math.sin(this.carAngle) * this.localAcceleration.x + Math.cos(this.carAngle) * this.localAcceleration.y;

			// Compute global velocity
			let accelerationDelta = this.acceleration.copy();
			accelerationDelta.mult(dt);
			this.velocity.add(accelerationDelta);

			this.absVelocity = this.velocity.getMag(); // Get speed of velocity in metres per second
			this.speed = this.localVelocity.x * 3600 / 1000; // Calculate speed in KM/hr
			this.imperialSpeed = this.speed * 0.621371; // Miles per hour

			// Calculate amount of rotational force
			let angularTorque = (frictionForceFront + tractionForce.y) * this.cgToFrontAxle - frictionForceRear * this.cgToRearAxle;

			// Stop car if speed is negligible
			if (this.absVelocity < (0.01 / (this.gearRatios[this.gear] || 1)) || (this.absVelocity < 1 && this.brake === 1)) {
				this.velocity = new Vector();
				this.absVelocity = 0;
				angularTorque = 0;
				this.yawRate = 0;
				this.corneringForce = 0;
			}

			// Calculate car angle from angular torque
			let angularAcceleration = angularTorque / this.mass;
			this.yawRate += angularAcceleration * dt;
			this.carAngle += this.yawRate * dt;

			// Calculate new car position
			let velocityDelta = this.velocity.copy();
			velocityDelta.mult(dt*length);

			// movement of car
			this.root.position.x -= velocityDelta.y;
			this.root.position.z -= velocityDelta.x;

			// angle of car
			this.root.rotation.y = this.carAngle;

			this.wheelRotationRate = this.speed / this.wheelRadius;

			// wheels rolling
			var angularSpeedRatio = 1 / this.wheelRadius;

			var wheelDelta = this.speed * dt * angularSpeedRatio;

			frontLeftWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;
			frontRightWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;
			backLeftWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;
			backRightWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;

			// rotation while steering
			frontLeftWheelRoot.rotation[ this.wheelTurnAxis ] = this.steeringAngle;
			frontRightWheelRoot.rotation[ this.wheelTurnAxis ] = this.steeringAngle;

			steeringWheel.rotation[ this.steeringWheelTurnAxis ] = -this.steeringAngle * 6;
		}

		applySound() {
			this.audio.engine.volume((this.throttle + 0.3) * volumeSlider.value / 100);

			this.audio.engine.rate(this.rpm/1000 * 2 + 1);
				
		}

		updateTimer() {
			if (!this.moved && this.speed > 0) {
				this.moved = true;
				this.time = Date.now();
				this.stopSpeeds = [50, 100, 150, 200];
				console.log("Started timer");
			} else if (this.moved && this.speed == 0) {
				this.moved = false;
				console.log("Reset timer");
			}

			for (var i = 0; i < this.stopSpeeds.length; i++) {
				var speed = this.stopSpeeds[i];
				if (this.moved && this.imperialSpeed > speed) {
					console.log("Reached", speed, "in", Date.now()-this.time, "ms");
					this.stopSpeeds[i] = Infinity;
				}
			}
			
		}

		update(dt) {
			if ( ! loaded || ! this.enabled ) return; // Update when ready

			this.getInputs(dt);
			this.applyPhysics(dt);
			this.applySound();

			this.updateTimer();
		}

		setModel(model, elemNames) {
			if ( elemNames ) this.elemNames = elemNames;

			this.root = model;

			this.setupWheels();
			this.computeDimensions();

			loaded = true;
		}

		setupWheels() {
			frontLeftWheelRoot = this.root.getObjectByName( this.elemNames.flWheel );
			frontRightWheelRoot = this.root.getObjectByName( this.elemNames.frWheel );
			backLeftWheel = this.root.getObjectByName( this.elemNames.rlWheel );
			backRightWheel = this.root.getObjectByName( this.elemNames.rrWheel );

			if ( this.elemNames.steeringWheel !== null ) steeringWheel = this.root.getObjectByName( this.elemNames.steeringWheel );

			while ( frontLeftWheelRoot.children.length > 0 ) frontLeftWheel.add( frontLeftWheelRoot.children[ 0 ] );
			while ( frontRightWheelRoot.children.length > 0 ) frontRightWheel.add( frontRightWheelRoot.children[ 0 ] );

			frontLeftWheelRoot.add( frontLeftWheel );
			frontRightWheelRoot.add( frontRightWheel );
		}

		computeDimensions() {
			var bb = new Box3().setFromObject( frontLeftWheelRoot );

			var size = new Vector3();
			bb.getSize( size );

			wheelDiameter = Math.max( size.x, size.y, size.z );

			bb.setFromObject( this.root );

			size = bb.getSize( size );
			length = Math.max( size.x, size.y, size.z );
		}
	}

	return Car;

} )();

export { Car };


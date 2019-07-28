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

import * as THREE from '../../build/three.module.js';

var Car = ( function ( ) {

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

			// Car movement variables

			this.carAngle = 0;
			this.pos = new Vector(); // Position
			this.velocity = new Vector(); // Velocity
			this.localVelocity = new Vector();
			this.acceleration = new Vector(); // Acceleration
			this.localAcceleration = new Vector();
			this.absVelocity = 0; // Metres / Second
			this.speed = 0; // KM / Hour
			this.maxSpeed = 260;
			this.imperialSpeed = 0; // Miles per hour
			this.distanceTraveled = 0; // Miles

			// Fuel
			this.maxFuel = 18.0;
			this.fuel = 18.0 // Gallons

			// User inputs

			this.steer = 0;
			this.throttle = 0;
			this.brake = 0;
			this.eBrake = 0;

			// Engine curves (Newton meters)
			this.torqueCurve = new Graph([[0, 0], [1000, 400], [2000, 433], [3000, 450], [4000, 470], [4400, 475], [5000, 430], [5500, 400], [6000, 350], [7000, 330]]) // Corvette C5
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

			this.rearR = 0;
			this.rearL = 0;
			this.frontR = 0;
			this.frontL = 0;

			// Position
			this.FL_wheelPos = new THREE.Vector3();
			this.FR_wheelPos = new THREE.Vector3();
			this.RL_wheelPos = new THREE.Vector3();
			this.RR_wheelPos = new THREE.Vector3();

			// Wheel models
			this.frontLeftWheelRoot = null;
			this.frontRightWheelRoot = null;

			this.frontLeftWheel = new Group();
			this.frontRightWheel = new Group();
			this.rearLeftWheel = null;
			this.rearRightWheel = null;

			this.slipAngleFront = 0;
			this.slipAngleRear = 0;
			this.wheelRPM = 0;

			// Orientation variables
			this.yawRate = 0;
			this.steeringAngle = 0; // Steering angle
			this.bodyRoll = 0;
			this.maxBodyRoll = 5;
			this.camberAngle = 0;
			this.maxCamber = 5;

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
			this.height = 0.55;
			this.halfWidth = 0.95;
			this.trackWidth = this.halfWidth * 2;
			this.cgToFront = 2.25;
			this.cgToRear = 2.25;   // Centre of gravity to rear of chassis
			this.cgToFrontAxle = 1.25;  // Centre gravity to front axle
			this.cgToRearAxle = 1.25;  // Centre gravity to rear axle
			this.wheelBase = this.cgToFrontAxle + this.cgToRearAxle;
			this.cgHeight = 0.55;  // Centre gravity height
			this.wheelRadius = 0.358;  // Includes tire (also represents height of axle)
			this.wheelRotationRate = 0;

			this.w = (this.cgToFront + this.cgToRear);
			this.h = this.halfWidth*2;
			this.boundingBox = {
				tl: new Vector(-this.w/2, -this.h/2),
				br: new Vector(this.w/2, this.h/2)
			}

			this.tireGrip = 2.0;
			this.lockGrip = 0.7;
			this.driveForce = 8000;
			this.brakeForce = 12000;
			this.eBrakeForce = this.brakeForce / 2.5;
			this.weightTransfer = 0.2;
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
				ctrl.steerLeftPosition = window.innerWidth/2-50;
				ctrl.steerRightPosition = window.innerWidth/2+50;
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

		computeWeightTransfer() { // wt stands for Weight Transfer
			let weight = this.mass * this.gravity;

			// Compute static weight on front and rear axle
			this.axleWeightFront = (this.cgToFrontAxle / this.wheelBase) * weight;
			this.axleWeightRear = (this.cgToRearAxle / this.wheelBase) * weight;

			// Weight on axles based on center of gravity and weight shift due to forward/reverse acceleration
			this.wtAcceleration = (this.height / this.wheelBase) * this.mass * this.localAcceleration.x;
			this.axleWeightFront -= this.wtAcceleration;
			this.axleWeightRear += this.wtAcceleration;

			// Weight transfer from lateral force
			this.wtLateralRear = (this.localAcceleration.y / this.gravity) * this.axleWeightRear * this.height / this.trackWidth;
			this.wtLateralFront = (this.localAcceleration.y / this.gravity) * this.axleWeightFront * this.height / this.trackWidth;
			this.wtLateral = this.wtLateralRear + this.wtLateralFront;

			// Update each wheel's weight
			this.rearR = this.axleWeightRear/2 + this.wtLateralRear;
			this.rearL = this.axleWeightRear/2 - this.wtLateralRear;
			this.frontR = this.axleWeightFront/2 + this.wtLateralFront;
			this.frontL = this.axleWeightFront/2 - this.wtLateralFront;

			// Compute body roll angle
			this.bodyRoll = (Math.sign(this.localAcceleration.y)) * (this.wtLateral / weight) * this.maxBodyRoll;

			// Compute the camber angle
			this.camberAngle = Math.abs((this.wtAcceleration / weight)) * this.maxCamber;

			// Weight transfer from body roll
			this.wtRoll = (Math.sign(this.localAcceleration.y) * this.height * Math.sin(Math.abs(this.bodyRoll)) / this.trackWidth) * weight

			// Update each wheel's weight // Might need to switch signs
			this.rearR -= this.wtRoll / 2;
			this.rearL += this.wtRoll / 2;
			this.frontR -= this.wtRoll / 2;
			this.frontL += this.wtRoll / 2;

			// Compute position of the bottom of the wheels relative to CG
			this.RR_wheelPos.copy(car.root.children[1].position);
			this.RL_wheelPos.copy(car.root.children[2].position);
			this.FL_wheelPos.copy(car.root.children[3].position);
			this.FR_wheelPos.copy(car.root.children[4].position);

			this.RR_wheelPos.y = this.RL_wheelPos.y = this.FL_wheelPos.y = this.FR_wheelPos.y = 0;
		}

		applyPhysics(dt) {
			// Get car local velocity
			this.localVelocity.x = Math.cos(this.carAngle) * this.velocity.x + Math.sin(this.carAngle) * this.velocity.y;
			this.localVelocity.y = Math.cos(this.carAngle) * this.velocity.y - Math.sin(this.carAngle) * this.velocity.x;

			this.computeWeightTransfer();

			var yawSpeedFront = this.cgToFrontAxle * this.yawRate;
			var yawSpeedRear = -this.cgToRearAxle * this.yawRate;

			// Calculate sideslip angle for car
			this.sideslipAngle = (this.carAngle%rad(360) - this.velocity.getDir())%rad(360);

			// Calculate slip angle for front/back wheel
			this.slipAngleFront = Math.atan2(this.localVelocity.y + yawSpeedFront, Math.abs(this.localVelocity.x)) - Math.sign(this.localVelocity.x) * this.steeringAngle;
			this.slipAngleRear = Math.atan2(this.localVelocity.y + yawSpeedRear,  Math.abs(this.localVelocity.x));

			var tireGripFront = this.tireGrip;
			var tireGripRear = this.tireGrip * (1.0 - this.eBrake * (1.0 - this.lockGrip)); // reduce rear grip when ebrake is on

			// Calculate cornering forces for front and rear axle
			var frictionForceFront = Math.clamp(-this.cornerStiffnessFront * this.slipAngleFront, -tireGripFront, tireGripFront) * this.axleWeightFront;
			var frictionForceRear = Math.clamp(-this.cornerStiffnessRear * this.slipAngleRear, -tireGripRear, tireGripRear) * this.axleWeightRear;

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

			// Cut gas if higher than redline
			if (this.rpm > 7000) {
				this.throttle = 0;
			}

			// Automatic transmission
			if (gearSelect.checked && this.gear > 0) {

				if (this.rpm > 5000 && this.gear < 6) {
					this.gear += 1;
				} else if (this.rpm < 1000 && this.gear > 1) {
					this.gear -= 1;
				}

				/*var lastGear = this.gear - 1;

				if (lastGear > 0 && this.localVelocity.x * 60 * this.gearRatios[lastGear] * this.differentialRatio / (2 * Math.PI * this.wheelRadius) <= 5000) {
					this.gear = lastGear;
				}*/
			}

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

			// Set car position
			this.root.position.x -= velocityDelta.y;
			this.root.position.z -= velocityDelta.x;

			// Update distance traveled
			this.distanceTraveled += (Math.abs(this.localVelocity.x) * dt / 3600) * 3600 / 1000;

			// Set car angle
			this.root.rotation.y = this.carAngle;

			// Rotation of wheels
			this.wheelRotationRate = this.speed / this.wheelRadius; // Angular velocity of wheels
			var wheelDelta = this.wheelRotationRate * dt;

			this.frontLeftWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;
			this.frontRightWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;
			this.rearLeftWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;
			this.rearRightWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;

			// Steering angle rotation
			this.frontLeftWheelRoot.rotation[ this.wheelTurnAxis ] = this.steeringAngle;
			this.frontRightWheelRoot.rotation[ this.wheelTurnAxis ] = this.steeringAngle;

			// Steering wheel rotation
			steeringWheel.rotation[ this.steeringWheelTurnAxis ] = -this.steeringAngle * 6;

			// Car rotation

			/*var v1 = new THREE.Vector3(1, 1, 1) 
			var v2 = new THREE.Vector3(1, 1, -1)
			var quaternion = new THREE.Quaternion();

			quaternion.setFromUnitVectors( v1, v2 );

			car.root.applyQuaternion(quaternion);*/

			//car.root.setRotationFromAxisAngle ( new THREE.Vector3(1, 0, 0), rad(30) );

		}

		applySound(dt) {
			let newVolume = (this.throttle + 0.3) * volumeSlider.value / 100;
			this.audio.engine.volume(Math.clamp(newVolume, 0, 1));
			this.audio.engine.rate((this.rpm/1000 * 2 + 1) || 1);
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
			this.applySound(dt);

			//this.updateTimer();
		}

		setModel(model, elemNames) {
			if ( elemNames ) this.elemNames = elemNames;

			this.root = model;

			this.setupWheels();
			this.computeDimensions();

			loaded = true;
		}

		setupWheels() {
			this.frontLeftWheelRoot = this.root.getObjectByName( this.elemNames.flWheel );
			this.frontRightWheelRoot = this.root.getObjectByName( this.elemNames.frWheel );
			this.rearLeftWheel = this.root.getObjectByName( this.elemNames.rlWheel );
			this.rearRightWheel = this.root.getObjectByName( this.elemNames.rrWheel );

			if ( this.elemNames.steeringWheel !== null ) steeringWheel = this.root.getObjectByName( this.elemNames.steeringWheel );

			while ( this.frontLeftWheelRoot.children.length > 0 ) this.frontLeftWheel.add( this.frontLeftWheelRoot.children[ 0 ] );
			while ( this.frontRightWheelRoot.children.length > 0 ) this.frontRightWheel.add( this.frontRightWheelRoot.children[ 0 ] );

			this.frontLeftWheelRoot.add( this.frontLeftWheel );
			this.frontRightWheelRoot.add( this.frontRightWheel );
		}

		computeDimensions() {
			var bb = new Box3().setFromObject( this.frontLeftWheelRoot );

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


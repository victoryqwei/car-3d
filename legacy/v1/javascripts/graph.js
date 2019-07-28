class Graph {
	constructor(points) {
		this.points = [];

		this.addPoints(points);
	}

	addPoint(point) {

	}

	addPoints(array) {
		if (!array || array.length < 2)
			return;
		for (let point of array) {
			this.points.push(point);
		}
	}

	print() {
		for (let point of this.points) {
			console.log(point);
		}
	}

	interpolate(index) { // Includes extrapolation
		let p1, p2, xLength, interpolatedValue, t;

		var p = this.points;

		for (var i = 0; i < p.length-1; i++) {
			if (index < p[0][0]) {
				p1 = p[0];
				p2 = p[1];
			} else if (index > p[p.length-1][0]) {
				p1 = p[p.length-2];
				p2 = p[p.length-1];
			} else if (index >= p[i][0] && index <= p[i+1][0]) {
				p1 = p[i];
				p2 = p[i+1];
			}

			if (p1) {
				xLength = p2[0]-p1[0];

				t = (index-p1[0])/xLength;

				interpolatedValue = (1-t)*p1[1] + t*p2[1];

				return interpolatedValue;
			}
		}
	}
}
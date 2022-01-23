'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const editForm = document.querySelector('.edit_form');

class Workout {
  date = new Date();
  id = (new Date().getTime() + ' ').slice(-8);

  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  _calcDescription() {
    this.description = `${this.type} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} `;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this._calcPace();
    this._calcDescription();
  }

  _calcPace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(distance, duration, coords, elevation) {
    super(distance, duration, coords);
    this.elevation = elevation;
    this._calcSpeed();
    this._calcDescription();
  }

  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}

const test = new Running(10, 10, [50, 50], 50);
console.log(test);
test.duration = 50;
console.log(test.distance);

class App {
  #map;
  #mapEvent;
  #workouts = [];
  constructor() {
    this._getPosition();
    this._getLocalStorage();

    // EVENT HANDLERS
    inputType.addEventListener('change', this._toggleElevationFiled);
    form.addEventListener('submit', this._newWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    // containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert(`can't access your location`);
      }
    );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    console.log(mapE);
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationFiled() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // check if it Running
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // validation inputs
      if (
        !validInputs(duration, distance, cadence) ||
        !allPositive(duration, distance, cadence)
      ) {
        alert('wrong inputs');
        return;
      }

      workout = new Running(distance, duration, [lat, lng], cadence);
    }
    // check if it cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(duration, distance, elevation) ||
        !allPositive(duration, distance, elevation)
      ) {
        alert('wrong inputs');
        return;
      }
      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    this._renderWorkoutMarker(workout);

    this._renderWorkoutList(workout);

    this._hideForm();

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = `        
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <div class="workout__options">
          <span class="workout__edit">edit</span>
          <span class="workout__delete">X</span>
        </div> 
      <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      } </span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `          
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(2)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }

    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(2)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    // setTimeout((form.style.display = 'grid'), 1000);
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _setLocalStorage() {
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'));

    if (!data) return;

    // console.log(data);

    data.forEach(work => {
      if (work.type === 'running')
        this.#workouts.push(
          new Running(work.distance, work.duration, work.coords, work.cadence)
        );
      if (work.type === 'cycling')
        this.#workouts.push(
          new Cycling(work.distance, work.duration, work.coords, work.elevation)
        );
    });

    // data
    //   .filter(work => work.type === 'running')
    //   .forEach(runningWork => {
    //     this.#workouts.push(
    //       new Running(
    //         runningWork.distance,
    //         runningWork.duration,
    //         runningWork.coords,
    //         runningWork.cadence
    //       )
    //     );
    //   });

    data.forEach(workout => {
      console.log(workout.type);
    });

    // this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkoutList(workout);
    });
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const selectedWorkout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(selectedWorkout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  reset() {
    localStorage.removeItem('workout');
    location.reload();
  }

  // _editWorkout(e) {
  //   // delete selected workout
  //   // alert (select on map)
  //   //
  //   if (!e.target.classList.contains('workout__edit')) return;
  //   const workoutEl = e.target.closest('.workout');
  //   console.log(workoutEl);
  //   const selectedWorkout = this.#workouts.find(
  //     work => work.id === workoutEl.dataset.id
  //   );

  //   editForm.classList.remove('hidden');
  //   inputDistance.focus();

  //   editForm.addEventListener('submit', e => {
  //     e.preventDefault();
  //     console.log(selectedWorkout);
  //     selectedWorkout.duration = inputDuration.value;
  //     selectedWorkout._calcPace();

  //     this.#workouts.forEach(work => {
  //       this._renderWorkoutList(work);
  //     });

  //     console.log(selectedWorkout.coords);
  //   });
  // }
}

const app = new App();

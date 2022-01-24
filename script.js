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
const editInputType = document.querySelector('.edit_form__input--type');
const editInputDistance = document.querySelector('.edit_form__input--distance');
const editInputDuration = document.querySelector('.edit_form__input--duration');
const editInputCadence = document.querySelector('.edit_form__input--cadence');
const editInputElevation = document.querySelector(
  '.edit_form__input--elevation'
);

const btnSort = document.querySelector('.sort__input_type');
const btnDeleteAll = document.querySelector('.btn_delete-all');

class Workout {
  date = new Date();
  id = (Math.random() * 10 + ' ').slice(-8);

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
  #selectedWorkout;
  #marker = [];
  constructor() {
    this._getPosition();
    this._getLocalStorage();

    // EVENT HANDLERS
    inputType.addEventListener('change', this._toggleElevationFiled);
    editInputType.addEventListener('change', this._toggleEditTypeFiled);
    form.addEventListener('submit', this._newWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    btnDeleteAll.addEventListener('click', this._deleteAll.bind(this));
    btnSort.addEventListener('change', this._sort.bind(this));
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
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationFiled() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _toggleEditTypeFiled() {
    editInputElevation
      .closest('.form__row')
      .classList.toggle('edit_form__row--hidden');
    editInputCadence
      .closest('.form__row')
      .classList.toggle('edit_form__row--hidden');
  }

  _toggleElevationFiledEdit() {
    editInputElevation
      .closest('.form__row')
      .classList.add('edit_form__row--hidden');
    editInputCadence
      .closest('.form__row')
      .classList.remove('edit_form__row--hidden');
  }

  _toggleCadenceFiledEdit() {
    editInputElevation
      .closest('.form__row')
      .classList.remove('edit_form__row--hidden');
    editInputCadence
      .closest('.form__row')
      .classList.add('edit_form__row--hidden');
  }

  _formValidation(...inputs) {
    const validInputs = inputs.every(inp => Number.isFinite(inp));
    const allPositive = inputs.every(inp => inp > 0);
    if (validInputs && allPositive) {
      return true;
    } else return false;
  }

  _newWorkout(e) {
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
      if (!this._formValidation(duration, distance, cadence)) {
        alert('wrong inputs');
        return;
      }

      workout = new Running(distance, duration, [lat, lng], cadence);
    }
    // check if it cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (!this._formValidation(duration, distance, elevation)) {
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
    this.#marker.push(
      L.marker(workout.coords, {
        title: workout.id,
      })
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
        .openPopup()
    );
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

    // make new Objects from data of localStorage
    data.forEach(work => {
      if (work.type === 'running') {
        this.#workouts.push(
          new Running(work.distance, work.duration, work.coords, work.cadence)
        );
      }
      if (work.type === 'cycling') {
        this.#workouts.push(
          new Cycling(work.distance, work.duration, work.coords, work.elevation)
        );
      }
    });

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

  _editWorkout(e) {
    if (!e.target.classList.contains('workout__edit')) return;

    const workoutEl = e.target.closest('.workout');

    this.#selectedWorkout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this._showEditForm();
    this._showCurrentValues(this.#selectedWorkout);

    editForm.addEventListener('submit', this._submitNewWorkout.bind(this));

    // workoutEl.remove();
  }

  _submitNewWorkout(e) {
    e.preventDefault();
    const type = editInputType.value;
    const distance = +editInputDistance.value;
    const duration = +editInputDuration.value;
    const id = this.#selectedWorkout.id;
    if (type === 'running') {
      const cadence = +editInputCadence.value;

      // validation inputs
      if (!this._formValidation(duration, distance, cadence)) {
        alert('wrong inputs');
        return;
      }

      this.#selectedWorkout.type = type;
      this.#selectedWorkout.duration = duration;
      this.#selectedWorkout.distance = distance;
      this.#selectedWorkout.cadence = cadence;
      this.#selectedWorkout._calcPace();
      // render the list

      // this.#workouts.forEach(work => this._renderWorkoutList(work));
    }

    if (type === 'cycling') {
      const elevation = +editInputElevation.value;

      // validation inputs
      if (!this._formValidation(duration, distance, elevation)) {
        alert('wrong inputs');
        return;
      }

      this.#selectedWorkout.type = type;
      this.#selectedWorkout.duration = duration;
      this.#selectedWorkout.distance = distance;
      this.#selectedWorkout.elevation = elevation;
      this.#selectedWorkout._calcSpeed();
    }
    this._renderWorkoutList(this.#selectedWorkout);

    // Find the current el and delete
    let workEl;
    allWorkE.forEach(work => {
      if (work.dataset.id === id) {
        workEl = work;
      }
    });
    workEl.remove();
    const allWorkE = containerWorkouts.querySelectorAll('.workout');

    this._hideEditForm();
    this._setLocalStorage();
  }

  _hideEditForm() {
    editForm.classList.add('hidden');
  }

  _showEditForm() {
    editForm.classList.remove('hidden');
  }

  _showCurrentValues(work) {
    editInputType.value = work.type;
    editInputDistance.value = work.distance;
    editInputDuration.value = work.duration;

    if (work.type === 'running') {
      this._toggleElevationFiledEdit();
      editInputCadence.value = work.cadence;
    }
    if (work.type === 'cycling') {
      this._toggleCadenceFiledEdit();
      editInputElevation.value = work.elevation;
    }
  }

  _deleteWorkout(e) {
    if (!e.target.classList.contains('workout__delete')) return;

    // workout html Element
    const workoutEl = e.target.closest('.workout');

    // workout object
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // workout Index
    const workoutIndex = this.#workouts.findIndex(
      work => work.id === workoutEl.dataset.id
    );

    // find the marker which we want to delete
    const [marker] = this.#marker.filter(
      marker => marker.options.title === workout.id
    );

    marker.removeFrom(this.#map); // delete the marker from map
    this.#workouts.splice(workoutIndex, 1); // remove workout object from list
    workoutEl.remove(); // remove the element
    this._setLocalStorage(); // save current workout list to the localStorage
  }

  _deleteAll() {
    if (this.#workouts === []) return;
    this.#marker.forEach(marker => marker.removeFrom(this.#map));

    const allWorkE = containerWorkouts.querySelectorAll('.workout');
    allWorkE.forEach(workE => workE.remove());

    this.#workouts = [];

    this._setLocalStorage();
  }

  _sort(e) {
    console.log(btnSort.value);
    if (btnSort.value === 'distance') {
      const workouts = this.#workouts
        .slice()
        .sort((a, b) => a.distance - b.distance);

      this._delAndReplace(workouts);
    }

    if (btnSort.value === 'duration') {
      const workouts = this.#workouts
        .slice()
        .sort((a, b) => a.duration - b.duration);

      this._delAndReplace(workouts);
    }

    if (btnSort.value === 'type') {
      const workouts = this.#workouts
        .slice()
        .sort((a, b) => (a.type > b.type ? 1 : -1));

      this._delAndReplace(workouts);
    }

    if (btnSort.value === 'date') {
      this._delAndReplace(this.#workouts);
    }
  }

  _delAndReplace(workouts) {
    const allWorkE = containerWorkouts.querySelectorAll('.workout');
    allWorkE.forEach(workE => workE.remove());
    workouts.forEach(work => this._renderWorkoutList(work));
  }
}

const app = new App();

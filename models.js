const mongoose = require ('mongoose');
mongoose.Promise = global.Promise;


const TaskSchema = new mongoose.Schema({
  q: { type: String, required: true },
  a: String,
  level: { type: Number, required: true },
  img: String
});

const LexemeSchema = new mongoose.Schema({
  lexeme: { type: String, required: true },
  tasks: [ TaskSchema ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

LexemeSchema.method('update', function(updates, callback) {
  const { _id: _, ...rest } = updates; // ignore ID
  const tasks = [].concat(this.tasks).concat(updates.tasks);

  // loop through tasks – not very clean because private API
  // - if same id  –> only keep last one
  // - if q == "-" –> delete
  const filteredTasks = tasks.filter( (task, index) => {
    if (task.q === '-') return false;
    let returnVal = true;
    console.log('task #'+ index +': ' + task._id);
    for (let i = index+1; i<tasks.length; i++) { // go throught tasks after this
      console.log(tasks[i]._id);
      if (task._id == tasks[i]._id) returnVal = false;
      console.log(returnVal);
    }
    return returnVal;
  });

  Object.assign(this, rest, { tasks: filteredTasks }, { updatedAt: Date.now() } );
  this.save(callback);
});



const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: Number, default: 10 },
  newbie: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  lexemes: [
    {
      lexeme_id: String,
      times_right: { type: Number, default: 0 },
      times_wrong: { type: Number, default: 0 },
      mastery: { type: Number, default: 0 }
    }
  ]
});

UserSchema.method('update', function(updates, callback) {
  const { _id: _, ...rest } = updates;
  Object.assign(this, rest, { updatedAt: Date.now() } );
  this.save(callback);
});



// create collections
const Lexeme = mongoose.model('Lexeme', LexemeSchema);
const User = mongoose.model('User', UserSchema);

module.exports.Lexeme = Lexeme;
module.exports.User = User;

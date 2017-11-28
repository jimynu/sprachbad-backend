const mongoose = require ('mongoose');
mongoose.Promise = global.Promise;


const TaskSchema = new mongoose.Schema({
  q: { type: String, required: true },
  a: String,
  level: { type: Number, required: true },
  img: String,
  source: String
});

const LexemeSchema = new mongoose.Schema({
  lexeme: { type: String, required: true },
  tasks: [ TaskSchema ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

LexemeSchema.method('update', function(updates, callback) {
  const { _id: _, ...rest } = updates; // ignore ID
  const tasks = [...this.tasks, ...updates.tasks];
  const filteredTasks = tasks // loop through tasks (private API)
    .filter( ({ q }) =>  q !== '-' ) // - if q === "-" –> delete
    .filter( ({ _id: id }, index, arr) => { // - if same id  –> only keep last one
      return index >= arr.map( el => String(el._id) ).lastIndexOf(String(id));
    })
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

const mongoose = require ('mongoose');
mongoose.Promise = global.Promise;


const TaskSchema = new mongoose.Schema({
  q: { type: String, required: true },
  a: String,
  level: { type: Number, required: true },
  img: String,
  source: String,
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
  password: { type: String, required: true },
  level: { type: Number, default: 10 },
  newbie: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  lexemes: [ {
    lexeme: { type: mongoose.Schema.Types.ObjectId, ref: 'Lexeme' },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    progress: { type: Number, default: 1 },
    lastLearnt: Date
  } ]
});


UserSchema.method('update', function(updates, callback) {
  const { _id: _, password: _password, ...rest } = updates; // password can't be changed at the moment
  Object.assign(this, rest, { updatedAt: Date.now() } );
  this.save(callback);
});


UserSchema.method('updateProgress', function(update, callback) {
  const lexemes = [...this.lexemes].map( lexeme => {
    if ( String(lexeme.id) === String(update.id) ) {
      update.lastLearnt = Date.now();
      return update;
    } else return lexeme;
  });
  Object.assign(this, { lexemes } );
  this.save(callback);
});



const TokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  token: String
});

TokenSchema.method('replace', function(token, callback) {
  Object.assign(this, { token } );
  console.log(this);
  this.save(callback);
});



const RoleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  role: String
});



// create collections
const Lexeme = mongoose.model('Lexeme', LexemeSchema);
const User = mongoose.model('User', UserSchema);
const Token = mongoose.model('Token', TokenSchema);
const Role = mongoose.model('Role', RoleSchema);

module.exports.Lexeme = Lexeme;
module.exports.User = User;
module.exports.Token = Token;
module.exports.Role = Role;

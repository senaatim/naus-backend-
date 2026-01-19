const nodemailer = require('nodemailer');

console.log('Nodemailer imported:', typeof nodemailer);
console.log('createTransporter exists:', typeof nodemailer.createTransporter);
console.log('Nodemailer object keys:', Object.keys(nodemailer));

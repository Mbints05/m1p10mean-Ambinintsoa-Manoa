const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const app = express()
const functions = require('./functions')
const nodemailer = require('nodemailer')

var datetime = require('node-datetime');
var dt = datetime.create();
var format = dt.format('Y-m-d H:M:S');
var formatDate = dt.format('Y-m-d');

var resp = 'systemealerte05@gmail.com';
var recept = 'rakotombin@gmail.com';

let mailTransporter = nodemailer.createTransport({
  service:'gmail',
  auth:{
    user:resp,
    pass:'oadncykwcxfsutal'
  }
});

let mailDetails = {
  from:resp,
  to:recept,
  subject:'Test Mail NODE JS',
  text:"Test d'envoi réussi à "+recept+" sur Node JS"
};

require('./dotenv')

const connectionString = process.env.MONGO_URI

MongoClient.connect(connectionString, { useUnifiedTopology: true })
  .then(client => {
    console.log('Connected to Database')
    const db = client.db('test')
    const vC= db.collection('VoitureClient')
    const vR = db.collection('VoitureRepare')
    const probleme = db.collection('Probleme')
    const reparation = db.collection('Reparation')
    const facture = db.collection('Facture')
    const depense = db.collection('depense')
    // ========================
    // Middlewares
    // ========================
    //app.set('view engine', 'ejs')
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(express.static('public'));

    // ========================
    // Routes
    // ========================
    app.get('/', (req, res) => {
      functions.listVehicle(vC)
        .then(quotes => {
          res.json({ quotes: quotes })
        })
        .catch(/* ... */)
    })

    app.get('/sendMail', (req, res) => {
      mailTransporter.sendMail(mailDetails)
        .then(result=>{
          res.json('Email sent')
        })
        .catch(res.json('Email errors'))
    })

    app.get('/details/:matricule', (req, res) => {
      functions.getVehicleDetails(probleme,req.params.matricule)
        .then(quotes => {
          res.json({ details: quotes })
        })
        .catch(/* ... */)
    })

    app.post('/deposer',(req, res) => {
      probleme.findOne({carMatricul:req.body.matricule,piece:req.body.piece})
        .then(result => {
          if(result === null){
            res.json('Requete introuvable')
          }else{
            functions.insertReparation(reparation,result)
              .then(resultat => {
                  if(resultat.insertedCount != 0){
                    reparation.findOneAndUpdate(
                      { 
                        carMatricul : req.body.matricule,
                        piece : req.body.piece
                      },{
                        $set: {
                          prix : req.body.prix
                        }
                      },{upsert: true}
                    )
                      .then(results =>{
                        res.json('Valider')
                      })
                    
                  }else{
                    res.json('Erreur insertion')
                  }               
              })  
          }
        })
        .catch()
    })

    app.post('/reparer', (req, res) => {
      reparation.findOne(
        {
          carMatricul:req.body.matricule,
          piece:req.body.piece
        })
        .then(result =>{
          if((result.avancement+req.body.valeur) <= 100){
            reparation.findOneAndUpdate(
              {
                carMatricul:req.body.matricule,
                piece:req.body.piece
              },{
                $set:{
                  avancement:(result.avancement+req.body.valeur)
                }
              },{upset:true}
            )
              .then(resultat => {res.json('Avancement de '+req.body.piece+': '+(result.avancement+req.body.valeur)+'%')})
              .catch(error => console.error(error))
            if((result.avancement+req.body.valeur) === 100){
              reparation.findOneAndUpdate(
                {
                  carMatricul:req.body.matricule,
                  piece:req.body.piece
                },{
                  $set:{
                    dateheureFin:format,
                    etat:1
                  }
                },{upset:true}
              )
                .then(resultat => {
                  probleme.findOneAndUpdate({
                    carMatricul:req.body.matricule,
                    piece:req.body.piece
                  },{
                    $set:{
                      etat:0
                    }
                  },{upsert:true})
                    .then(results =>{
                      //res.json('voiture :'+req.body.matricule+','+req.body.piece+' réparé.')
                    })
                })
                .catch(error => console.error(error))
            }
          }else if((result.avancement+req.body.valeur) > 100 ){
            res.json('Valeur actuelle :'+result.avancement+'%,ajouter '+(100-result.avancement)+'%')
          }
        })
    })


    app.post('/validation', (req, res) => {
      functions.verifSortie(reparation,req.body.matricule).then(val =>{
        if(val === 0){
          functions.validationSortie(vR,reparation,req.body.matricule)
            .then(result => {
              res.json(result)    
            })
        }else{
          res.json("La voiture "+req.body.matricule+" ne peut pas encore sortir.")
        }
      })
    })

    app.get('/facture/:matricule', (req, res) => {
      functions.insertFacture(reparation,facture,req.params.matricule)
        .then(result =>{
          facture.find({carMatricul:req.params.matricule,dateheure:format}).toArray()
            .then(factures =>{
              res.json(factures)
            })
        })
    })

    app.get('/listeVoitureRepare', (req, res) => {
      vR.find().toArray()
        .then(result =>{
          res.json(result)
        })
    })

    app.get('/chiffre/:filter', (req, res) => {
      functions.chiffreDaffaire(facture,req.params.filter)
        .then(results =>{
          res.json(results)
        })
    })

    app.get('/tempsReparation/:matricule', (req, res) => {
      functions.tempsReparationVoiture(reparation,req.params.matricule)
        .then(results =>{
          res.json(results)
        })
    })        
    
    app.post('/depense', (req, res) => {
      
      var nombre = Object.keys(req.body).length;
      for(var i=0;i<nombre;i++){
        depense.insertOne({ref:Object.keys(req.body)[i],prix:Object.values(req.body)[i],dateDepense:formatDate})
          .then(result =>{
            res.json(result)
          })
      }
    })

    app.get('/viewDepense', (req, res) => {
      functions.depense(depense,'mois')
        .then(results =>{
          res.json(results)
        })
    })

    app.get('/viewBenefice', (req, res) => {
      functions.benefice(depense,facture)
        .then(results =>{
          res.json(results)
        })
    })

    app.post('/quotes', (req, res) => {
      functions.insertVehicle(vC,req.body)
        .then(result => {
          res.redirect('/')
        })
        .catch(error => console.error(error))
    })

    app.put('/quotes', (req, res) => {
      vC.findOneAndUpdate(
        { name: 'Yoda' },
        {
          $set: {
            name: req.body.name,
            lastname: req.body.lastname,
            age : req.body.age
          }
        },
        {
          upsert: true
        }
      )
        .then(result => res.json('Success'))
        .catch(error => console.error(error))
    })

    app.get('/supprimer/:name', (req, res) => {
      functions.deleteVehicle(vC,req.params.name)
        .then(result => {
          if (result.deletedCount === 0) {
            return res.json('No quote to delete')
          }
          res.redirect('/')
        })
        .catch(error => console.error(error))
    })
  })
  .catch(console.error)

module.exports = app;
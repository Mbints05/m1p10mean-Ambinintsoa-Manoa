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
  subject:'Voiture réparée',
  text:"Votre voiture est réparée,vous pouvez la récupérer."
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
    const depot = db.collection('depot')
    const user = db.collection('user')
    // ========================
    // Middlewares
    // ========================
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(express.static('public'));

    // ========================
    // Routes
    // ========================
    app.get('/api/listVehicle', (req, res) => {
      functions.listVehicle(vC)
        .then(quotes => {
          console.log('Appel')
          res.send(quotes)
        })
        .catch(/* ... */)
    })

    app.post('/api/insertClient',(req,res)=>{
      user.insertOne({
        nom:req.body.nom,
        prenom:req.body.prenom,
        contact:req.body.contact,
        email:req.body.email,
        mdp:req.body.mdp,
        adresse:req.body.adresse,
        role:'Client'
      })
        .then(result=>{
          res.json("OK")
        })
    })

    app.post('/api/verifLogin',(req,res)=>{
      user.findOne({
        email:req.body.email,
        mdp:req.body.mdp
      })
        .then(result=>{
          if(result === null){
            res.send('Erreur')
          }else{
            res.send('Ok')
          }
        })
    })

    app.get('/api/details/:matricule', (req, res) => {
      functions.getVehicleDetails(probleme,req.params.matricule)
        .then(quotes => {
          res.json({ details: quotes })
        })
        .catch(/* ... */)
    })

    app.post('/api/debutReparation',(req, res) => {
      probleme.findOne({carMatricul:req.body.matricule,piece:req.body.piece,etat:1})
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

    app.get('/api/deposer/:matricule',(req, res) => {
      probleme.findOne({carMatricul:req.params.matricule,etat:1})
        .then(result => {
          if(result === null){
            res.json('Requete introuvable')
          }else{
            depot.insertOne({
              dateheure:format,
              etat:1,
              userName:result[0].clientName,
              userSurname:result[0].clientUsername,
              userContact:result[0].clientContact,
              garageNom:'E-Garage',
              garageAdresse:'Bis000Logt00',
              clientName:result[0].clientName,
              clientSurname:result[0].clientUsername,
              clientContact:result[0].clientContact,
              carMark:result[0].carMark,
              carModel:result[0].carModel,
              carMatricul:result[0].carMatricul
            })
              .then(resultat => {
                  res.send("Insertion dans le depot");           
              })  
          }
        })
        .catch()
    })

    app.post('/api/reparer', (req, res) => {
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


    app.post('/api/validation', (req, res) => {
      functions.verifSortie(reparation,req.body.matricule).then(val =>{
        if(val === 0){
          functions.validationSortie(vR,reparation,req.body.matricule)
            .then(result => {
              mailTransporter.sendMail(mailDetails)
              .then(result=>{
                res.json('Email sent')
              })
              .catch(res.json('Email errors'))    
            })
        }else{
          res.json("La voiture "+req.body.matricule+" ne peut pas encore sortir.")
        }
      })
    })

    app.get('/api/facture/:matricule', (req, res) => {
      functions.insertFacture(reparation,facture,req.params.matricule)
        .then(result =>{
          facture.find({carMatricul:req.params.matricule,dateheure:format}).toArray()
            .then(factures =>{
              res.json(factures)
            })
        })
    })

    app.get('/api/listeVoitureRepare', (req, res) => {
      vR.find().toArray()
        .then(result =>{
          res.json(result)
        })
    })

    app.get('/api/chiffre/:filter', (req, res) => {
      functions.chiffreDaffaire(facture,req.params.filter)
        .then(results =>{
          res.json(results)
        })
    })

    app.get('/api/tempsReparation/:matricule', (req, res) => {
      functions.tempsReparationVoiture(reparation,req.params.matricule)
        .then(results =>{
          res.json(results)
        })
    })        
    
    app.post('/api/depense', (req, res) => {
      
      var nombre = Object.keys(req.body).length;
      for(var i=0;i<nombre;i++){
        depense.insertOne({ref:Object.keys(req.body)[i],prix:Object.values(req.body)[i],dateDepense:formatDate})
          .then(result =>{
            res.json(result)
          })
      }
    })

    app.get('/api/viewDepense', (req, res) => {
      functions.depense(depense,'mois')
        .then(results =>{
          res.json(results)
        })
    })

    app.get('/api/viewBenefice', (req, res) => {
      functions.benefice(depense,facture)
        .then(results =>{
          res.json(results)
        })
    })

    app.post('/api/quotes', (req, res) => {
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

    app.get('/api/supprimer/:name', (req, res) => {
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
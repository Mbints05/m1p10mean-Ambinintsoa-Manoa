var datetime = require('node-datetime');
var dt = datetime.create();
var format = dt.format('Y-m-d H:M:S');

function listVehicle(collection){
      return collection.find().toArray();
}
function insertVehicle(collection,params){
	return collection.insertOne(params);
}
function deleteVehicle(collection,params){
	return collection.deleteOne({name : params});
}
function getVehicleDetails(collection,params){
	return collection.find({carMatricul : params}).toArray();
}
function insertReparation(reparation,probleme){

	return reparation.insertOne(
		{
			carMark :probleme.carMark,
			carModel :probleme.carModel,
			carMatricul :probleme.carMatricul,
			clientName :probleme.clientName,
			clientUsername :probleme.clientUsername,
			clientContact :probleme.clientContact,
			piece :probleme.piece,
			avancement : 0,
			dateheureDebut : format
		}
	)
}
function insertFacture(reparation,collection,matricule){
	var date = [];
	return reparation.find({carMatricul:matricule,etat:2}).toArray()
		.then(sortie => {
			for(var i=0;i<sortie.length;i++){
				date.push({
					reference : 'FACT'+sortie[i].carMatricul,
					carMark :sortie[i].carMark,
					carModel :sortie[i].carModel,
					carMatricul :sortie[i].carMatricul,
					clientName :sortie[i].clientName,
					clientUsername :sortie[i].clientUsername,
					clientContact :sortie[i].clientContact,
					piece :sortie[i].piece,
					montant:sortie[i].prix,
					dateSortie : sortie[i].dateSortie,
					dateheure : format
				})
				
			}
			return collection.insertMany(date,{ordered:true})			
		})
}

function pourcReparationVehicle(reparation,matricule){
	var pourc = 0;
	return reparation.find({carMatricul:matricule}).toArray()
		.then(result => {
			for(var i=0;i<result.length;i++){
				pourc += result[i].avancement
			}
			return pourc
		}) 
}
function totalPourc(reparation,matricule){
	return reparation.countDocuments({carMatricul:matricule})
		.then(result => {
			return result*100
		})	
}
function verifSortie(reparation,matricule){
	var retour = 2;
	return pourcReparationVehicle(reparation,matricule)
		.then(result => {
			return totalPourc(reparation,matricule)
				.then(resultat => {
					if(result < resultat) retour = 1
					if(result === resultat) retour = 0
					return retour	
				})
		})
}
function validationSortie(vr,reparation,matricule){
		return reparation.updateMany(
			{
				carMatricul:matricule,
				etat:1
			},{
				$set:{
					etat:2,
					dateSortie:format
				}
			},{upsert:true}
		).then(result =>{
			return vr.insertOne({
				matricule : matricule,
				dateSortie : format
			})
		})	
}
function tempsReparationVoiture(reparation,matricule){
	var pipeline = [
		{$match :{carMatricul:matricule,etat:2}},
		{$group:{_id:{daty:"$dateSortie"},hoursDiff:{$avg:{
					$dateDiff:{
						startDate :{$toDate:"$dateheureDebut"},
						endDate :{$toDate:"$dateheureFin"},
						unit:"second"
					}
				}}}}
	];
	return reparation.aggregate(pipeline).toArray();
}
function chiffreDaffaire(facture,filter){
	var pipeline = null;
	if(filter === 'jour'){
		pipeline = [{$group:{_id:{daty:"$dateSortie"},montant:{$sum:"$montant"}}}];		
	}if(filter === 'mois'){
		pipeline = [{$group:{_id:{mois:{$month:{$dateFromString:{dateString:"$dateSortie",format:"%Y-%m-%d %H:%M:%S"}}},annee:{$year:{$dateFromString:{dateString:"$dateSortie",format:"%Y-%m-%d %H:%M:%S"}}}},montant:{$sum:"$montant"}}}];
	}
	return facture.aggregate(pipeline).toArray()
}

function depense(depense,filter){
	var pipeline = null;
	if(filter === 'jour'){
		pipeline = [{$group:{_id:{daty:"$dateDepense"},montant:{$sum:"$prix"}}}];		
	}if(filter === 'mois'){
		pipeline = [{$group:{_id:{mois:{$month:{$dateFromString:{dateString:"$dateDepense",format:"%Y-%m-%d"}}},annee:{$year:{$dateFromString:{dateString:"$dateDepense",format:"%Y-%m-%d"}}}},montant:{$sum:"$prix"}}}];
	}
	return depense.aggregate(pipeline).toArray()	
}
function benefice(depenses,facture){
	var data = [];
	var mois =null;
	var annee= null;
	var benefice = null;
	var taille = null;
	return depense(depenses,'mois')
		.then(dep =>{
			return chiffreDaffaire(facture,"mois")
				.then(affaire=>{
					if(dep.length<=affaire.length){
						mois = affaire;
						annee = affaire;
						taille = affaire.length;
					}else{
						mois = dep;
						annee = dep;
						taille = dep.length
					}
					for(var i=0;i<taille;i++){
						 benefice = affaire[i].montant - dep[i].montant;
						data.push({
							mois:mois[i]._id.mois,
							annee:annee[i]._id.annee,
							chiffre:affaire[i].montant,
							deps:dep[i].montant,
							benefice:benefice
						})
					}
					return data;
				})		
		})	
}

exports.listVehicle = listVehicle;
exports.insertVehicle = insertVehicle;
exports.getVehicleDetails = getVehicleDetails;
exports.insertReparation = insertReparation;
exports.verifSortie = verifSortie;
exports.validationSortie = validationSortie;
exports.insertFacture = insertFacture;
exports.chiffreDaffaire = chiffreDaffaire;
exports.tempsReparationVoiture = tempsReparationVoiture;
exports.depense = depense;
exports.benefice = benefice;
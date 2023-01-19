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

function pourcReparationVehicle(reparation,matricule){
	var somme = reparation.countDocuments({carMatricul:matricule});
	var repeared = reparation.aggregate({$match:{carMatricul:matricule}},{$group:{_id:null,sum_val:{$sum:'$avancement'}}});
	var pourcentage = somme;
	return pourcentage;
}

function validationSortie(reparation){
	return 
}

exports.listVehicle = listVehicle;
exports.insertVehicle = insertVehicle;
exports.deleteVehicle = deleteVehicle;
exports.getVehicleDetails = getVehicleDetails;
exports.insertReparation = insertReparation;
exports.pourcReparationVehicle = pourcReparationVehicle;
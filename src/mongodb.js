
// -------------------------------------------------------------------------- Mongodb

class Mongodb {
	constructor() {
		this.client = stitch.Stitch.initializeDefaultAppClient('bamboo-rwymp');
		this.db = this.client.getServiceClient(stitch.RemoteMongoClient.factory, 'mongodb-atlas').db('bamboo-db');
	}

	isLoggedIn() {
		if (this.client.auth.hasRedirectResult()) {
			this.client.auth.handleRedirectResult();
			return true;
		}
		return this.client.auth.isLoggedIn;
	}

	userID() {
		return this.client.auth.user.id;
	}

	async loginWithEmailAndPassword({ email, password }) {
		const credential = new stitch.UserPasswordCredential(email, password);
		return await this.client.auth.loginWithCredential(credential);
	}

	async logout() {
		if (!this.isLoggedIn()) {
			return;
    }

		await this.client.auth.logout();
	}

	async getPhrases() {
		if (!this.isLoggedIn()) {
			return;
    }

		const collection = this.db.collection('phrases');
		// TODO: store like 30 different random words a day and only show those for the day so we don't
		// have to call mongodb every single time we open a new tab
		return await collection.aggregate([
			{
				$match: {
					$and: [
						{ owner_id: this.userID() },
						{ confidence: { $gt: 0 } },
						{ confidence: { $lt: 10 } }
					]
				}
			},
			{
				$sample: {
					size: 30
				}
			}
		]).toArray();
	}

	async changeConfidence({ _id, newConfidence }) {
		if (!this.isLoggedIn()) {
			return;
		}

		// if the id is not a ObjectId then make it one (id's loaded from chrome storage will not be ObjectId's)
		if (typeof _id === 'string') {
			_id = new stitch.BSON.ObjectId(_id);
		}

		const collection = this.db.collection('phrases');
		const data = await collection.updateOne({ _id }, {
			$set: { confidence: newConfidence }
		});
		return {
			confidence: newConfidence,
			valid: true // TODO: data.isValid or something
		};
  }
  
  async getCharacters(characters) {
		if (!this.isLoggedIn()) {
			return;
		}
		const collection = this.db.collection('characters');
		return await collection.find({ character: { $in: [...characters] } }).toArray();
	}

	async savePhrase(phrase) {
		if (!this.isLoggedIn()) {
			return;
		}
		const collection = this.db.collection('phrases');
    const storePhrase = phrase.getStorable(this.userID());
    
    // TODO: check for duplicates here and prevent create, suggest update

		if (!storePhrase._id) {
			return await collection.insertOne(storePhrase);
		}
		return await collection.updateOne({ _id: storePhrase._id }, storePhrase);
	}
}

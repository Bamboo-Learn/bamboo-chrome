

// ----------------------------------------------------------------------------- PHRASE

const DEFAULT_PHRASE = (userID) => new Phrase({
	owner_id: userID,
	confidence: 0,
	// privacy: 'PRIVATE',
	category: 'User',
	pinyin: '',
	english: '',
	characters: ''
});

class Phrase {
	constructor(phrase) {
		this._id = phrase._id;
		this.owner_id = phrase.owner_id; // TODO: might not be needed here, we set it later before save
		this.characters = phrase.characters;
		this.pinyin = phrase.pinyin;
		this.english = phrase.english;
		this.category = phrase.category;
		this.confidence = phrase.confidence;
		this.created_at = phrase.created_at;
		// this.status = phrase.status
		// this.privacy = phrase.privacy;
		this.setOriginal();
	}

	setOriginal() {
		this.original = {
			characters: this.characters,
			english: this.english,
			confidence: this.confidence,
			pinyin: this.pinyin
		};
	}

	// sets the original to the current (does not save to db)
	save({ insertedId }) {
		if (isSet(insertedId)) {
			// if this is newly inserted then add id
			this._id = insertedId;
		}
		this.setOriginal();
	}

	// takes the original and sets the actual to that (erases changes)
	revert() {
		this.characters = this.original.characters;
		this.english = this.original.english;
		this.confidence = this.original.confidence;
		this.pinyin = this.original.pinyin;
	}

	// returns true if fields are blank
	isMissingRequiredField() {
		return !isSet(this.characters);
	}

	// returns true when this phrase has been edited
	isEdited() {
		return !this.original ||
			this.original.english !== this.english ||
			this.original.characters !== this.characters ||
			this.original.confidence !== this.confidence ||
			this.original.pinyin !== this.pinyin;
	}

	isDuplicate(phrases) {
		let count = 0;
		phrases.forEach(phrase => {
			if (phrase.characters === this.characters) {
				count++
				if (count >= 2) return true;
			}
		});
		return count >= 2;
	}

	isSaveable(phrases) {
		// it is saveable if it has been edited, is not missing fields, and is not a duplicate
		return this.isEdited() && !this.isMissingRequiredField() && !this.isDuplicate(phrases);
	}

	// returns true when this phrase is registered in db
	isInDB() {
		return isSet(this._id);
	}

	// changes the confidence
	cycleStatus() {
		switch (this.confidence) {
			case 0:
				this.confidence = 5;
				return;
			case 10:
				this.confidence = 0;
				return;
			default:
				this.confidence = 10;
				return;
		}
	}

	getStorable(user_id) {
		return {
			_id: this._id,
			characters: this.characters,
			pinyin: this.pinyin,
			confidence: this.confidence,
			english: this.english,
			owner_id: user_id, // necessary
			created_at: this.created_at || new Date()
		}
	}

	autofill(lookupChars, fields) {
		let pinyin = '';
		let english = '';
		for (let i = 0; i < this.characters.length; i++) {
			const character = this.characters.charAt(i);
			try {
				const lookupChar = lookupChars.find(luc => luc.character === character);
				english += (i === this.characters.length - 1) ? lookupChar.english : lookupChar.english + ' | ';
				pinyin += lookupChar.pinyin[0] + ' ';
			} catch {
				english += ' _ | ';
				pinyin += '_ ';
			}
		}
		if (fields.english) {
			this.english = english.trim();
		}
		if (fields.pinyin) {
			this.pinyin = pinyin.trim();
		}
		return this;
	}
}

if (typeof TinyMighty == 'undefined') {
  var TinyMighty = {}
}
/* Commented object names are for navigation in Espresso, do not remove! */

//TinyMighty.Util
TinyMighty.Util  = {
	//Copies over prototype methods & properties
	/* Thanks to http://chamnapchhorn.blogspot.com/2009/05/javascript-mixins.html */
	mixin: function mixin(recipient) {
		//console.group('Mixing in...');
		for(var i=1, len = arguments.length; i < len; i++){
			if(typeof arguments[i] != 'function' && typeof arguments[i] != 'object')
				throw 'InvalidArgument';
			var prototype = (typeof arguments[i] == 'object') ? false : true;
			var recurse = (prototype) ? arguments[i].prototype : arguments[i];
			for(methodName in recurse){
				
				if(!recipient.prototype[methodName] && methodName!='onMixin'){
					//console.log(methodName);
					recipient.prototype[methodName] = recurse[methodName];
				}
			}
			if(recurse.onMixin && typeof recurse.onMixin == 'function')
				recurse.onMixin.call(recipient.prototype);
			
		}
		//console.log('to...');
		//console.log(recipient);
		//console.groupEnd();
	},

	extend: function extend(recipient,newmethods){
		for(var i=1, len = arguments.length; i < len; i++){
			if(typeof arguments[i] != 'object')
				throw 'InvalidArgument';

			for(methodName in arguments[i]){
				recipient.prototype[methodName] = arguments[i][methodName];
			}
			
		}
	},
	
	object: function object(obj){
		if(typeof obj == 'function'){
			tmp = function(){}
			tmp.prototype = obj.prototype;
			return new tmp;
		}
		return obj;
	},
	
	bindEventScope: function bindEventScope(func,scope,data){
		//console.log(arguments);
		if(!data)
			var data = {}
		return function eventScopeClosure(event){
			return func.call(scope,event,data);
		}
	},
	
	/*
	thanks to http://my.opera.com/GreyWyvern/blog/show.dml/1725165 for the clone function
	this will iteratively copy all properties from one object to another.
	Note that while literals will be copied, functions will still be references to the original function, not copies.
	This *could* be added with  eval('['+functionprop.toString()+']')[0]; if necessary, but until it's needed I prefer to avoid eval...
	
	Also, beware of cyclical references!
	*/
	clone: function clone(object) {
	  var newObj = (this instanceof Array) ? [] : {};
	  for (i in object) {
	    //if (i == 'clone') continue;
	    if (object[i] && typeof this[i] == "object") {
	      newObj[i] = object[i].clone();
	    } else newObj[i] = object[i]
	  } return newObj;
	},
	
	merge: function(left, right){
		var newleft = this.clone(left);
		for(prop in right){
			if(newleft[prop] && typeof right[prop] == 'object'){
				newleft[prop] = this.merge(newleft[prop],right[prop]);
			}else{
				newleft[prop] = right[prop];
			}
		}
		return newleft;
	}
}


//ObjectRegistry
TinyMighty.ObjectRegistry = function(namespace){
	this.namespace = (namespace == undefined) ? '__global' : namespace;
	if(this.registry[namespace]==undefined)
		this.registry[namespace] = {};
}
TinyMighty.ObjectRegistry.prototype = {
	registry:{}, //defined in the prototype so it's shared between all objects
	add: function add(type,id,obj){
		//console.group('Adding object to registry ('+this.namespace+'): '+type+', '+id);
		//console.log(obj);
		//console.groupEnd();
		if(!this.registry[this.namespace][type])
			this.registry[this.namespace][type] = {}
		this.registry[this.namespace][type][id] = obj;
	},
	find: function find(type,id){
		//console.log('Attempting to fetch object from registry: '+type+', '+id);
		if(this.registry[this.namespace][type] && this.registry[this.namespace][type][id])
			return this.registry[this.namespace][type][id];
		return false;
	},
	clear: function clear(){
		this.registry[this.namespace] = {}
	}
}


TinyMighty.Event = function event(name,data,info){
	this.name = name;
	this.info = info ? info : {}
	this.data = data ? data : {}
	this.stopped = false;
	this.defaultPrevented = false;
}
TinyMighty.Event.prototype = {
	//stops the event propogating to the next bound callbacks
	stop: function stop(){
		this.stopped = true;
		return this;
	},
	isStopped: function isStopped(){
		return this.stopped;
	},
	//prevents the default event action
	preventDefault: function preventDefault(){
		this.defaultPrevented = true;
		return this;
	},
	isDefaultPrevented: function isDefaultPrevented(){
		return this.defaultPrevented;
	},
	getName: function getName(){
		return this.name;
	},
	getInfo: function getInfo(){
		return this.info;
	},
	getData: function getData(){
		return this.data;
	}
}

/* Mixin Modules */
if(!TinyMighty.Mixin)
	TinyMighty.Mixin = {}
//Events Mixin
TinyMighty.Mixin.Events = {
	onMixin: function mixin(){
		//console.log('Mixing in Events');
	},
	sendEvent: function sendEvent(event){
		//Relies on this.giving being defined in the mixin target
		return TinyMighty.Giving.sendEvent(this,event);
	},
	bind: function bind(eventName,func){
		return TinyMighty.Giving.bind(this,eventName,func);
	}
}

//Options Mixin
TinyMighty.Mixin.Options = {
	onMixin: function mixin(){
		if(!this.settings)
			this.settings = {}
		if(!this.options)
			this.options = {}
	},
	setOptions: function setOptions(options){
		this.options = TinyMighty.Util.merge(this.settings,options);
	}
}

//GetSet Mixin
TinyMighty.Mixin.GetSet = {
	onMixin: function mixin(){
		//console.log('mixing in GetSet');
		//mixin.requires(TinyMighty.Giving.Options);
		//console.log(this);
		if(!this.setOptions)
			throw new TinyMighty.Error('GetSet requires options');
		if(!this.settings.getset)
			this.settings.getset = {}
	},
	set: function set(key, value){
		if(this.options && this.options.getset && this.options.getset.dataStorePropertyName && this[this.options.getset.dataStorePropertyName]){
			var currentValue = this[this.options.getset.dataStorePropertyName];
		}else if(this[key]){
			var currentValue = this[key];
		}else{
			var currentValue = null;
		}
		if(this._beforeSet && typeof this._afterSet == 'function')
			value = this.beforeSet(key,value);
		this.sendEvent( new TinyMighty.Giving.Event('beforeSet',{keyName:key,currentValue:currentValue,newValue:value}) );
		
		var setterName = 'set'+key.charAt(0).toUpperCase() + key.slice(1);
		if(typeof this[setterName] == 'function' && arguments.callee.caller != this[setterName]){
			this[setterName](key,value);
		}else{
			if(this.options && this.options.getset && this.options.getset.dataStorePropertyName && this[this.options.getset.dataStorePropertyName]){
				this[this.options.getset.dataStorePropertyName][key] = value;
			}else{
				this[key] = value;
			}
		}
		if(this._afterSet && typeof this._afterSet == 'function')
			this._afterSet();
		this.sendEvent( new TinyMighty.Giving.Event('afterSet',{keyName:key,oldValue:currentValue,newValue:value}) );

	},
	
	get: function get(key){
		this.sendEvent( new TinyMighty.Giving.Event('beforeGet',{keyName:key}) );
		var getterName = 'get'+key.charAt(0).toUpperCase() + key.slice(1);
		var returnValue = false;
		if(typeof this[getterName] == 'function' && arguments.callee.caller != this[getterName]){
			returnValue = this[getterName](key);
		}else{
			if(this.options && this.options.getset && this.options.getset.dataStorePropertyName && this[this.options.getset.dataStorePropertyName]){
				returnValue = this[this.options.getset.dataStorePropertyName][key];
			}else{
				returnValue = this[key];
			}
		}
		this.sendEvent( new TinyMighty.Giving.Event('afterGet',{keyName:key,value:returnValue}) );
		return returnValue;
	}
}

//Is Mixin
TinyMighty.Mixin.Is = {
	onMixin: function mixin(){
		if(!this.settings.is)
			this.settings.is = {};
		//console.log('mixing in Is');
	},
	is: function is(property){
		if(this.options.is[property] && this.options.is[property]===true){
			return true;
		}else{
			return false;
		}
	}
}




TinyMighty.Error = function tinymightyError(message,code){
	if(!code)
		code = '';
	console.error(code+' '+message);
}
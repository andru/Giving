if (typeof TinyMighty == 'undefined') {
  var TinyMighty = {}
}
/* Commented object names are for navigation in Espresso, do not remove! */

//Giving
TinyMighty.Giving = {
	init: function init(options,items){
		
		this.options = TinyMighty.Util.merge(this.settings,options);
				
		if(items && items.length>0){
			for(var i=0, len=items.length; i<len; i++){
				TinyMighty.Giving.Item.factory(items[i]);
			}
		}
				
		Persist.remove('flash');
		this.storage = new Persist.Store('Giving');
		
		this.order = new TinyMighty.Giving.Order(this.options);
		
	//	if(options.searchPage)
	//		var scanner = new TinyMighty.Giving.Scanner(this.options);
	},
	
	setting: {
		locale:"en_GB",
		currency:"EUR",
		language:"en",
		scanDOM:true,
		debug:true,
		scanner:{
			
		},
		payment:{
			cheque:{}
		}
	},
	
	objectCache: {},
	
	bound: {},

	formatPrice: function formatPrice(num){
		num = parseFloat(num);
		if(typeof num !== 'number')
			return 'NaN';
		var price = num.toString().replace(/\$|\,/g,'');
		if(isNaN(price))
			price = "0";
		var sign = (price == (price = Math.abs(price)));
		var whole = Math.floor(price*100+0.50000000001);
		var fraction = whole%100;
		whole = Math.floor(whole/100).toString();
		if(fraction<10)
			fraction = "0" + fraction;
		for (var i = 0; i < Math.floor((whole.length-(1+i))/3); i++)
			whole = whole.substring(0,whole.length-(4*i+3))+','+
			whole.substring(price.length-(4*i+3));
		return (((sign)?'':'-') + '$' + whole + '.' + fraction);
	},
	
	bind: function bind(){
		var args = arguments;
		if(args.length==3){
			var object = (typeof args[0] == 'function') ? args[0] : null;
			var ev = args[1];
			var func = args[2];
		}else if(args.length==2){
			var object = null;
			var ev = args[0];
			var func = args[1];
		}else{
			throw 'InvalidArgumentCount';
		}
	
		if(typeof ev != 'string' || typeof func != 'function')
			throw 'InvalidEventParameters';

		var scope = (object!==null)? object.constructor : this.constructor;

		if(!this.bound[scope])
			this.bound[scope] = {}
		if(!this.bound[scope][ev])
			this.bound[scope][ev] = [];
		this.bound[scope][ev].push(func);
	},

	sendEvent: function sendEvent(){
		var scope = (arguments.length>1) ? arguments[0].constructor : this.constructor;
		var event = (arguments.length>1) ? arguments[1] : arguments[0];
	
		if(this.bound[scope] && this.bound[scope][event.name]){
			//send event
			for(var i=0; i<this.bound[scope][event.name].length; i++){
				var bound = this.bound[scope][event.name][i];
				bound.call(bound,event);
				if(event.isStopped()==true)
					break;
			}
		
		}
		//send event to global giving event scope
		if(scope !== this.constructor)
			this.sendEvent(event);
	
		return event;
	},
	
}

//Giving Error
TinyMighty.Giving.Error = TinyMighty.Error;
//Giving Event
TinyMighty.Giving.Event = TinyMighty.Event;

TinyMighty.Giving.ObjectRegistry = new TinyMighty.ObjectRegistry('Giving');


//Giving Order
TinyMighty.Giving.Order = function order(options){
	
	this.giving = TinyMighty.Giving;
		
	this.setOptions(options);
	
	this.storage = this.giving.storage;
	
	this.load();
	
	this.calculateTotals();

	//no point putting this here - event listeners can only be added after constructor has run!
	//var event = this.sendEvent( new TinyMighty.Giving.Event('orderLoadedLocal') );
}


TinyMighty.Giving.Order.prototype = {
	constructor: TinyMighty.Giving.Order,
	settings: {
		searchDom: true,
		buyClass: 'uc-buy'
	},
	items:[],
	quantities:[],
	status:0,
	totals: {
		item:0.0,
		shipping:0.0,
		discount:0.0,
		tax:0.0,
		total:0.0
	},
	syncStatus:{
		status:0,
		time: Date.now(),
		modified: false
	},
	statuses: ['Incomplete','Pending','Complete','Paid','Sent','Delivered','Returned','Cancelled','Refused'],
	stored: {},
	bound: {},
	
	addItem: function addItem(item,quantity){
		if(!item)
			throw new TinyMighty.Giving.Error('addItem called with an invalid or missing item argument');
		//if(item.constructor != Giving.Item){
		//	console.error("Not a valid item type!");
		//	return false;
		//}
		if(!quantity || quantity.constructor != Number || quantity < 1 || item.is('unique'))
			quantity = 1;
			
		//item = item.clone(); //so any modifications from event do not affect existing order items
		var event = this.sendEvent( new TinyMighty.Giving.Event('beforeAddItem',{'order':this,'item':item,'quantity':quantity}));

		
		if(!event.isDefaultPrevented()){
			var index = this.getItemIndex(item);
			//console.log(index);
			if(index>-1){
				if(item.is('unique')){
					console.error('Item is unique.  Cannot add to order.');
					console.error(item);
					this.sendEvent( new TinyMighty.Giving.Event('addItemFailure',{'order':this,'item':item.clone(),'quantity':quantity}) );
				}else{
					this.items[index].quantity += quantity;
					this.quantities[index] += quantity;
					this.sendEvent( new TinyMighty.Giving.Event('addItemSuccess',{'order':this,'item':item.clone(),'quantity':quantity}) );
				}
			}else{
				//item.quantity = quantity;
				this.items.push(item);
				this.quantities.push(quantity);
				this.sendEvent( new TinyMighty.Giving.Event('addItemSuccess',{'order':this,'item':item.clone(),'quantity':quantity}) );
			}
		
			
			this.calculateTotals();
			this.store();
			
		}else{
			var event = this.sendEvent(new TinyMighty.Giving.Event('addItemPrevented') );
		}
		
		this.sendEvent( new TinyMighty.Giving.Event('afterAddItem',{'order':this,'item':item.clone(),'quantity':quantity}) );
		
	},
	addItemById: function addItemById(id,quantity){
		item = TinyMighty.Giving.Item.loadById(id);
		this.addItem(item,quantity);
	},
	getItemIndex: function getItemIndex(item){
		var id = item.get('id');
		for(i in this.items){
			if(this.items[i].get('id') == id)
				return i;
		}
		return -1;
	},
	removeItem: function removeItem(item,quantity){
		/*if(item.constructor != Giving.Item){
			console.error('Item '+item.get('id')+' cannot be removed.  Not a valid item type.');
			return false;
		}*/
		var index = this.getItemIndex(item);
		if(index<0){
			console.error('Item '+item.get('id')+' cannot be removed, as it does not exist in this order.');
			return false;
		}
		quantity = (typeof quantity == 'number') ? quantity : 1;
		
		if(quantity > this.quantities[index])
			quantity = this.quantities[index];
			
		var event = this.sendEvent( new TinyMighty.Giving.Event('beforeRemoveItem',{order:this,'item':item}) );
		if(!event.isDefaultPrevented()){
			if(this.quantities[index] == quantity){
				this.items.splice(index,1);
				this.quantities.splice(index,1);
			}else{
				this.quantities[index] -= quantity;
			}
			var event = this.sendEvent( new TinyMighty.Giving.Event('removeItemSuccess',{order:this,'item':item.clone()}) );
			this.calculateTotals();
			this.store();
		}else{
			var event = this.sendEvent( new TinyMighty.Giving.Event('removeItemPrevented',{'order':this,'item':item.clone()}));
		}
		var event = this.sendEvent( new TinyMighty.Giving.Event('afterRemoveItem',{order:this,'item':item.clone()}) );
		
	},
	removeItemById: function removeItemById(id,quantity){
		item = TinyMighty.Giving.Item.loadById(id);
		this.removeItem(item,quantity);
	},
	setQuantity: function setQuantity(item,quantity){
		var index = this.getItemIndex(item);
		if(index>-1)
			return this.quantities[index] = quantity;
		throw new TinyMighty.Giving.Error('InvalidItem');
	},
	getItems: function getItems(){
		var items = [];
		for(key in this.items){
			items.push( TinyMighty.Util.merge(this.items[key],{quantity:this.quantities[key]}) );
		}
		return items;
	},
	clear: function clear(){
		var event = this.sendEvent( new TinyMighty.Giving.Event('beforeClearItems',{order:this}) );
		if(!event.isDefaultPrevented()){
			this.items = []
			this.quantities = []
			var event = this.sendEvent( new TinyMighty.Giving.Event('clearItemsSuccess',{order:this}) );
			this.calculateTotals();
			this.store();
		}else{
			var event = this.sendEvent( new TinyMighty.Giving.Event('clearItemsPrevented',{order:this}) );
		}
		var event = this.sendEvent( new TinyMighty.Giving.Event('afterClearItems',{order:this}) );
		
	},
	reloadItems: function reloadItems(){
		
	},
	calculateTotals: function calculateTotals(){
		this.sendEvent( new TinyMighty.Giving.Event('beforeCalculateTotals',{'order':this}) );
		this.totals.total = 0.0;
		this.totals.item = 0.0;
		this.totals.tax = 0.0;
		this.totals.discount = 0.0;
		this.totals.shipping = 0.0;
		
		for(var i in this.items){
			var item = this.items[i];
			var quantity = this.quantities[i];
			
			this.totals.item += item.get('price')*quantity;
			if(item.is('taxable'))
				this.totals.tax += item.get('tax')*quantity;
			if(item.is('shippable'))
				this.totals.shipping += item.get('shipping')*quantity;
		}
		
		this.totals.total = this.totals.item - this.totals.discount + this.totals.tax + this.totals.shipping;
		this.sendEvent( new TinyMighty.Giving.Event('afterCalculateTotals',{'order':this}) );
		
	},
	purchase: function purchase(){
		this.calculateTotals();	
		var event = this.sendEvent( new TinyMighty.Giving.Event('beforePurchaseOrder',{'order':this}) );
		if(!event.isDefaultPrevented()){
			this.sendEvent( new TinyMighty.Giving.Event('purchaseOrder',{'order':this}) );
		}else{
			this.sendEvent( new TinyMighty.Giving.Event('purchaseOrderPrevented',{'order':this}) );
		}
		this.sendEvent( new TinyMighty.Giving.Event('afterPurchaseOrder',{'order':this}) );	
	},
	complete: function complete(){
		return this.setStatus(1);
	},
	cancel: function cancel(){
		
	},
	setStatus: function setStatus(status){
		if(typeof status == 'number'){
			this.status = status;
		}
		throw 'SetStatusTextNotImplemented';
	},
	sync: function sync(){
		var event = this.sendEvent( new TinyMighty.Giving.Event('beforeOrderSync',{'order':this}) );
		if(!event.isDefaultPrevented()){
			if(1==0){
				this.syncStatus.status = 1;
				this.sendEvent( new TinyMighty.Giving.Event('orderSyncSuccess',{'order':this}) );
			}else{
				this.sendEvent( new TinyMighty.Giving.Event('orderSyncFailure',{'order':this}) );
			}
		}else{
			this.sendEvent( new TinyMighty.Giving.Event('orderSyncPrevented',{'order':this}) );
		}
		this.sendEvent( new TinyMighty.Giving.Event('afterSync',{'order':this}) );
	},
	isSynched: function isSynched(){
		return this.syncStatus.status;
	},
	_unsync: function _unsync(){
		this.syncStatus.status = 0;
	},
	store: function store(){
		console.log('storing');
		var jsonItems = [];
		for (var i in this.items){
			console.log(this.items[i].serialize());
			var item = this.items[i].serialize();
			jsonItems[i] =  item;
		}
		console.log(jsonItems);
		jsonOrder = {
			'totals':this.totals,
			'items':jsonItems,
			'quantities':this.quantities,
			'status':this.status,
			'options':this.options
		}
		
		var event = this.sendEvent( new TinyMighty.Giving.Event('beforeStoreLocal',{order:this,json:jsonOrder}) );
		if(!event.isDefaultPrevented()){
			this.storage.set('order',JSON.stringify(jsonOrder));
			this.sendEvent( new TinyMighty.Giving.Event('storedLocalSuccess',{order:this.clone(),json:jsonOrder}) );
		}else{
			this.sendEvent( new TinyMighty.Giving.Event('storedLocalPrevented',{order:this}) );
		}
		this.sendEvent( new TinyMighty.Giving.Event('afterStoreLocal',{order:this.clone()}) );
	},
	
	load: function load(){
		var stored = null;
		var event = this.sendEvent( new TinyMighty.Giving.Event('beforeLoadLocal',{order:this}) );
		if(!event.isDefaultPrevented()){
			this.storage.get('order',function(ok,data){ if(ok && data) stored = JSON.parse(data); });
			if(stored){
				if(stored.status)
					this.status = stored.status;
				if(stored.totals)
					this.totals = stored.totals;
				if(stored.items){
					var items = []
					for(i in stored.items){
						var json = stored.items[i];
						items[i] = TinyMighty.Giving.Item.unserialize(json);
						//if(item.reload)
					}
					this.items = items;
				}
				if(stored.quantities)
					this.quantities = stored.quantities;
				if(stored.options)
					this.setOptions(stored.options);
				this.sendEvent( new TinyMighty.Giving.Event('loadLocalSuccess',{order:this}) );
			}
		}else{
			this.sendEvent( new TinyMighty.Giving.Event('loadLocalPrevented',{order:this}) );
		}
		this.sendEvent( new TinyMighty.Giving.Event('afterLoadLocal',{order:this}) );
	},
	
	clone: function clone(){
		return TinyMighty.Util.clone(this);
	}
	
	
}
TinyMighty.Util.mixin(TinyMighty.Giving.Order,
TinyMighty.Mixin.Events, 
TinyMighty.Mixin.Options,
TinyMighty.Mixin.GetSet,
TinyMighty.Mixin.Is );








TinyMighty.Giving.View = function view(giving,options){
	this.giving  = giving;
	this.setOptions(options);
}
TinyMighty.Util.mixin(TinyMighty.Giving.View, TinyMighty.Mixin.Events, TinyMighty.Mixin.Options);


/*TinyMighty.Giving.Model = function model(options){
	this.setOptions(options);
}
TinyMighty.Util.mixin(TinyMighty.Giving.View, TinyMighty.Giving.Options);*/

/*
Giving Item object

Anything item must inherit from this prototype, and:

-Have the following properties

	url - return REST URL for a json representation of this item.
	name
	price - {currency:XXX, value:1.23}
	
-Have the following methods
	
	getPrice([currency])
		return: float

*/

//Item
TinyMighty.Giving.Item = {
	loadById: function loadById(id){
		//we need to parse the url or check the data for the right type of object to instantiate!
		if(item = TinyMighty.Giving.ObjectRegistry.find('Item',id))
			return item;//new TinyMighty.Giving.Item(item.data,item.options)
		console.error( 'LoadByIdNotImplemented');
		//return new TinyMighty.Giving.Item(id);
	},
	unserialize: function unserialize(data){
		console.log('Unserializing');
		console.log(data);
		if(data.type == undefined)
			throw new Giving.Error('No type supplied in serialized data');
		if(!TinyMighty.Giving.Item[data.type])
			throw new Giving.Error('No item of type '+data.type+' is registered');
		options = {}
		if(data.options){
			options = data.options;
			delete data.options;
		}
		
		//console.info('Unserializing object:');
		//console.log(this);
		return new TinyMighty.Giving.Item[data.type](data,options);
	},
	factory: function factory(data){
		//console.log(this);
		//console.trace();
		return this.unserialize(data);
	}
}
//Abstract Item
TinyMighty.Giving.Item.Abstract = function AbstractItem(data,options){
	this.data = {}
	this.setOptions(options);
	this.setData(data);
}
TinyMighty.Util.extend(TinyMighty.Giving.Item.Abstract, {

	settings:{
		is:{
			taxable: false,
			shippable: false,
			downloadable: false,
			unique: false
		},
		getset:{
			dataStorePropertyName: 'data',
		},
		tax: {},
		shipping: {},
		download: {},
		defaultTax:{name:'VAT',rate:20,regions:['EU'],inclusive:true,preCalculated:false},
		defaultShipping:{}
	},
	
	setData: function setData(data){
		this.data = {}
		if(this.validateData(data)){

			for(key in data){
				this.set(key,data[key]);
			}
			
			this.calculate();
			
			//TinyMighty.Giving.ObjectRegistry.add('TinyMighty.Giving.Item.'+this.get('type'),this.get('id'),this);
			TinyMighty.Giving.ObjectRegistry.add('Item',this.get('id'),this);
		}else{
			throw new Giving.Error('Invalid Item Data');
		}
	},
	
	
	validateData: function validateData(data){
		if(data.type !== undefined)
			return true;
		return false;
	},
	
	getData: function getData(){
		var returnData = {}
		for(key in this.data){
			returnData[key] = this.get(key);
		}
		return returnData;
	},
	
	serialize: function serialize(){
		var d = this.getData();
		d.options = this.options;
		return d;
	},
	
	calculate: function(){
	
	},
	
	clone: function clone(){
		return TinyMighty.Util.clone(this);
	}

});

TinyMighty.Util.mixin(
	TinyMighty.Giving.Item.Abstract,
	TinyMighty.Mixin.Options,
	TinyMighty.Mixin.Events,
	TinyMighty.Mixin.GetSet,
	TinyMighty.Mixin.Is
);

//Donation
TinyMighty.Giving.Item.Donation = function DonationItem(data,options){
	TinyMighty.Giving.Item.Abstract.call(this,data,options);
}
TinyMighty.Giving.Item.Donation.prototype = TinyMighty.Util.object(TinyMighty.Giving.Item.Abstract);
TinyMighty.Util.extend(TinyMighty.Giving.Item.Donation, 
/* Donation is now a complete copy of Abstract*/
{
	/*
	
	
	_afterSet: function _afterSet(key,value){
		//this._saveCache();
	},
	
	_saveCache: function saveCache(){
		//TinyMighty.Giving.Cache.save('item',this.get('url'),{data:this.getData(),options:this.options});
	},
	
	//getPrice: function getPrice(){
	//	return parseFloat(this.data.price);
	//},*/
	
	calculate: function calculate(){
		//this.price = this.get('price');
	},
	
	clone: function clone(){
		return TinyMighty.Util.clone(this);
	}
	
});

TinyMighty.Giving.Item.DonationProduct = function DonationProduct(data,options){
	this.settings = TinyMighty.Util.merge(this.settings,{is:{shippable:true}});
	TinyMighty.Giving.Item.Abstract.call(this,data,options);
	if(!this.data.shipping)
		this.data.shipping = 0.50;
}
TinyMighty.Giving.Item.DonationProduct.prototype = TinyMighty.Util.object(TinyMighty.Giving.Item.Abstract);
TinyMighty.Util.extend(TinyMighty.Giving.Item.DonationProduct, {
	setShipping:function setShipping(shipping){
		this.set('shipping', shipping);
	},
	getShipping: function getShipping(){
		return this.data.shipping;
	}
});


/*TinyMighty.Util.mixin(TinyMighty.Giving.Item.Donation,{
	onMixin: function mixin(){
		this.settings.is.unique = true;
	},
	calculate: function calculate(){
	
	},
	validateData: function validateData(data){
		return true;
	}
});

TinyMighty.Giving.Item.Product = TinyMighty.Giving.Item.Abstract;
TinyMighty.Util.mixin(TinyMighty.Giving.Item.Product.prototype,{
	calculate: function calculate(){
		if(this.options.taxable){
			this.tax = 0;
			if(this.taxObject.rate > 0){
				if(this.taxObject.inclusive == true){
					if(this.taxObject.preCalculated == true){
						//DIFFICULT!
						this.tax = 500;//so we know to fix it ;)
					}else{
						this.tax = (this.taxObject.rate/100)*this.price;
						this.price = this.tax+this.price;
					}		
				}else{
					this.tax = (this.taxObject.rate/100)*this.price;
				}
			}
		}
	},
	
	validateData: function validateData(data){
		/*this.url = data.url;
		this.price = data.price;
		this.name = data.name;
				//this.quantity = data.quantity ? data.quantity : 0;
	
		this.taxObject = data.tax ? data.tax : this.options.defaultTax;
		//this.shippingObject = data.shipping ? data.shipping : this.options.defaultShipping;
		this.shipping = data.shipping ? data.shipping : 0;*/
		
		/*return true;
		
	}
	
},
TinyMighty.Giving.Events, 
TinyMighty.Giving.Options,
TinyMighty.Giving.GetSet,
TinyMighty.Giving.Is);*/











/*TinyMighty.Giving.

Order.purchase...

Giving.Gateway.process()

Order
Choose Gateway
Enter Payment data
Confirm
Order complete

paypal = new TinyMighty.Giving.Order.Gateway.PayPal({merchid:'test',something:'else'})
payment = paypal.process(order); //creates new payment

*/

TinyMighty.Giving.Process = function Process(order,options){
	if(order.get('items').length < 1){
		throw new TinyMighty.Giving.Error('Order is empty.');
	}
}

TinyMighty.Giving.Payment = function Payment(order,options){
	this.settings = {}
	this.setOptions(options);
	this.order = order;
	//console.log(order);
	
	this.order.bind('purchaseOrder',TinyMighty.Util.bindEventScope(this.start,this));
	
	this.init();
	//verify order, etc
}

TinyMighty.Util.mixin(TinyMighty.Giving.Payment, 
	TinyMighty.Mixin.Options,
	TinyMighty.Mixin.Events,
{
	init: function init(){
	},
	start: function start(){
	},
	complete: function complete(){	
	}
});

TinyMighty.Giving.Payment.Cheque = TinyMighty.Giving.Payment;
TinyMighty.Util.mixin(TinyMighty.Giving.Payment.Cheque, {
	init: function init(){
		
	},
});

TinyMighty.Giving.Payment.Paypal = TinyMighty.Giving.Payment;
//Giving.PaypalCheckout.constructor = Giving.Checkout.constructor;
TinyMighty.Util.mixin(TinyMighty.Giving.Payment.Paypal, {
	init: function init(){
		
	}
});


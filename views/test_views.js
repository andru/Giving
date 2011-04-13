TinyMighty.Giving.View.LogToConsole = function logToConsole(options){
	this.settings = {}
	this.giving = TinyMighty.Giving;
	this.setOptions(options);
	
	this.giving.order.bind('beforeAddItem',this.listener);
	this.giving.order.bind('addItemSuccess',this.listener);
	this.giving.order.bind('addItemPrevented',this.listener);
	this.giving.order.bind('afterAddItem',this.listener);

	this.giving.order.bind('beforeRemoveItem',this.listener);
	this.giving.order.bind('removeItemSuccess',this.listener);
	this.giving.order.bind('removeItemPrevented',this.listener);
	this.giving.order.bind('afterRemoveItem',this.listener);	
	
	this.giving.order.bind('beforeCalculateTotals',this.listener);
	this.giving.order.bind('afterCalculateTotals',this.listener);
	
	this.giving.order.bind('beforeClearItems',this.listener);
	this.giving.order.bind('clearItemsSuccess',this.listener);
	this.giving.order.bind('clearItemsPrevented',this.listener);
	this.giving.order.bind('afterClearItems',this.listener);
	
	this.giving.order.bind('beforeStoreLocal',this.listener );
	this.giving.order.bind('storeLocalSuccess',this.listener );
	this.giving.order.bind('storeLocalPrevented',this.listener );
	this.giving.order.bind('afterStoreLocal',this.listener );

}
TinyMighty.Giving.View.LogToConsole.prototype = new TinyMighty.Giving.View;
TinyMighty.Giving.View.LogToConsole.prototype.listener = function listener(event){
	console.log('received ['+event.getName()+'] event:');
	console.log(event.getData());
}



//waits for add to cart action and asks for a quantity
TinyMighty.Giving.View.Quantity = function quantity(giving,options){

	this.giving = giving;

	this.giving.order.bind('beforeAddItem',this.quantityDialogue);
}
TinyMighty.Giving.View.Quantity.prototype = new TinyMighty.Giving.View;
TinyMighty.Giving.View.Quantity.prototype.quantityDialogue = function quantityDialogue(event){

	quantity = parseInt(prompt("how many?",'1'));
	if(!quantity){
		event.stop();
		event.preventDefault();
		return false;
	}
	data = event.getData();
	data.order.setQuantity(data.item.url, quantity);
}

TinyMighty.Giving.View.Confirm = function confirm(giving,options){
	this.giving = giving;
	this.giving.order.bind('beforeAddItem',this.confirmDialogue);
}
TinyMighty.Giving.View.Confirm.prototype = new TinyMighty.Giving.View;
TinyMighty.Giving.View.Confirm.prototype.confirmDialogue = function comfirmDialogue(event){
	item = event.getData().item;
	proceed = confirm("Are you sure you want to add "+item.quantity+" x "+item.name+"?");
	if(!proceed){
		event.stop()
		event.preventDefault();
	}
}


TinyMighty.Giving.View.Order = function orderview(giving,options){
	var me = this;
	this.setOptions(options);

	this.giving = TinyMighty.Giving;
	this.order = this.giving.order;
//	this.giving.order.bind('afterAddItem', TinyMighty.Util.bindEventScope(me.updateOrderEvent,me) );
//	this.giving.order.bind('afterRemoveItem', TinyMighty.Util.bindEventScope(me.updateOrderEvent,me) );
//	this.giving.order.bind('afterClearItems', TinyMighty.Util.bindEventScope(me.updateOrderEvent,me) );
	this.giving.order.bind('afterCalculateTotals', TinyMighty.Util.bindEventScope(me.updateOrderEvent,me) );
	
	
	jQuery(document).ready(TinyMighty.Util.bindEventScope(function domreadycallback(){
		this.createView();
		this.updateOrder(this.order);
	},this));
	
}


TinyMighty.Giving.View.Order.prototype = {
	createView: function createView(){
		
		jQuery('<div id="giving-order"></div>').appendTo('body')
		.append('<h3>Donation</h3>')
		.append('<ul id="giving-order-items"></ul>')
		.append('<dl id="giving-order-totals"></dl>')
		.append('<div id="giving-order-checkout"><a href="/cart/checkout" id="checkout">Check Out</a></div>')
		.append('<div id="giving-order-clear"><a href="/cart/clear" id="clear">Clear</a></div>');
		
		jQuery('#giving-order-totals').append('<dt>Tax</dt><dd id="giving-order-totals-tax">0.00</dd>')
		.append('<dt>Discount</dt><dd id="giving-order-totals-discount">0.00</dd>')
		.append('<dt>Shipping</dt><dd id="giving-order-totals-shipping">0.00</dd>')
		.append('<dt>Total</dt><dd id="giving-order-totals-total">0.00</dt>')
		
		
		jQuery('#giving-order #giving-order-checkout a').bind('click',  TinyMighty.Util.bindEventScope(this.checkout,this) );
		jQuery('#giving-order #giving-order-clear a').bind('click',  TinyMighty.Util.bindEventScope(this.clearButtonClickEvent,this) );
		//jQuery('.decrease').live('click', TinyMighty.Util.bindEventScope( this.minusButtonClickEvent,this) );
		//jQuery('.increase').live('click', TinyMighty.Util.bindEventScope( this.plusButtonClickEvent,this) );		
		
		/*'<div id="order" style="border:1px solid red; padding:10px; float:right">
		<h3>Cart</h3>
		<ul>
		</ul>
		Tax: <span id="total-tax"></span><br />
		Shipping: <span id="total-shipping"></span><br />
		Discount: <span id="total-discount"></span><br />=
		<h4>Total: <span id="total"></span></h4>
		 - 
		</div>'*/
	},
	plusButtonClickEvent: function plusButtonClickEvent(event,data){
		event.preventDefault();
		this.order.addItemById(data.itemid,1);
	},
	minusButtonClickEvent: function minusButtonClickEvent(event,data){
		event.preventDefault();
		this.order.removeItemById(data.itemid,1);
	},
	removeButtonClickEvent: function deleteButtonClickEvent(event,data){
		event.preventDefault();
		this.order.removeItemById(data.itemid);
	},
	clearButtonClickEvent: function clearButtonClickEvent(event){
		event.preventDefault();
		this.order.clear();
	},
	updateOrderEvent: function updateOrderEvent(event){
		this.updateOrder(event.getData().order);
	},
	updateOrder: function updateOrder(order){
		jQuery('#giving-order ul#giving-order-items').empty();
		var items = order.get('items');
		var quantities = order.get('quantities');
		for(var i=0,c=items.length;i<c;i++){
			var item = items[i];
			var orderli = jQuery('<li></li>').appendTo('#giving-order ul#giving-order-items');
			jQuery('<a href="'+item.get('url')+'" class="remove">x</a>')
				.bind('click', TinyMighty.Util.bindEventScope( this.removeButtonClickEvent,this,{itemid:item.get('id')}) )
				.appendTo(orderli);
			if(!item.is('unique')){
				jQuery('<a href="'+item.get('url')+'" class="decrease">-</a>')
					.bind('click', TinyMighty.Util.bindEventScope( this.minusButtonClickEvent,this,{itemid:item.get('id')}) )
					.appendTo(orderli);
				orderli.append(quantities[i]);
				jQuery('<a href="'+item.get('url')+'" class="increase">+</a>')
					.bind('click', TinyMighty.Util.bindEventScope( this.plusButtonClickEvent,this,{itemid:item.get('id')}) )
					.appendTo(orderli);
				orderli.append(' &times; ')
				orderli.append(item.get('name')+' ('+Giving.formatPrice(item.get('price')*quantities[i])+')</li>');
			}else{
				orderli.append(item.get('name')+' ('+Giving.formatPrice(item.get('price'))+')</li>');
			}
		}
		jQuery('#giving-order #giving-order-totals-tax').text(TinyMighty.Giving.formatPrice(order.totals.tax));
		jQuery('#giving-order #giving-order-totals-shipping').text(TinyMighty.Giving.formatPrice(order.totals.shipping));
		jQuery('#giving-order #giving-order-totals-discount').text(TinyMighty.Giving.formatPrice(order.totals.discount));
		jQuery('#giving-order #giving-order-totals-total').text(TinyMighty.Giving.formatPrice(order.totals.total));
	},
	checkout: function checkout(event){
		event.preventDefault();
		//console.log(this);
		this.order.purchase();
	}
}
TinyMighty.Util.mixin(TinyMighty.Giving.View.Order,TinyMighty.Giving.View);




TinyMighty.Giving.View.CashDonation = function cashDonation(giving,options){
	var me = this;
	this.setOptions(options);

	this.giving = giving;
	this.order = giving.order;
	this.giving.order.bind('afterAddItem', TinyMighty.Util.bindEventScope(me.itemAdded,me) );
//	this.giving.order.bind('afterRemoveItem', TinyMighty.Util.bindEventScope(me.updateOrderEvent,me) );
//	this.giving.order.bind('afterClearItems', TinyMighty.Util.bindEventScope(me.updateOrderEvent,me) );
//	this.giving.order.bind('afterCalculateTotals', TinyMighty.Util.bindEventScope(me.updateOrderEvent,me) );
	
	
	jQuery(TinyMighty.Util.bindEventScope(function domreadycallback(){
	},this));
	
}
TinyMighty.Util.mixin(TinyMighty.Giving.View.CashDonation,TinyMighty.Giving.View,{
	itemAdded: function itemAdded(event){
		data = event.getData();
		item = data.item;
	},
});
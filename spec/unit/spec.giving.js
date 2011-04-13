
describe 'Giving'
	describe '.init()'
		it 'should apply options'
			Giving.init({test:'test'});
			Giving.options.should.have_property 'test', 'test'
	   end
		it 'should process items and add to object registry'
			Giving.init({},	
				[
					{
						type: 'Donation',
						id: 'test',
						name: 'Test Item',
						price: 10
					}
				]
				)
			TinyMighty.Giving.ObjectRegistry.registry.Giving.should.have_property 'Item'
			TinyMighty.Giving.ObjectRegistry.registry.Giving.Item.should.have_property 'test'
			//TinyMighty.Giving.ObjectRegistry.registry.Giving.Item.test.should.be_an_instance_of Giving.Item
		end
	end

	describe '.formatPrice()'
		it 'should return a string formatted price'
			Giving.formatPrice(10.27).should.be_a String
			Giving.formatPrice(10.27).should.equal '$10.27'
		end
	end
end

describe 'TinyMighty.Giving.ObjectRegistry'

	describe '.add()'
		it 'should add a test object to the registry'
			obj = {testproperty:'testobject'}
			TinyMighty.Giving.ObjectRegistry.add('testtype','testid',obj);
			TinyMighty.Giving.ObjectRegistry.registry.Giving.should.have_property 'testtype'
			TinyMighty.Giving.ObjectRegistry.registry.Giving.testtype.should.have_property 'testid'
			TinyMighty.Giving.ObjectRegistry.registry.Giving.testtype.testid.should.equal obj
		end
	end
	
	describe '.find()'
		it 'should retrieve a test object from the registry'
			obj = {testproperty:'testobject'}
			TinyMighty.Giving.ObjectRegistry.add('testtype','testid',obj);
			TinyMighty.Giving.ObjectRegistry.find('testtype','testid').should.equal obj
		end
	end
	
	
	
end


//should test events & mixins - skipping for now!
describe 'Giving.Item'
	before_each
		data = {type:'Donation',id:'testid',name:'testname',price:5.23}
	 	item = Giving.Item.factory(data,{testoption:'test'})
	end
	
	it 'should set data passed to the constructor'
		item.data.should.not.be_empty
		item.data.should.have_property 'id'
		item.data.should.have_property 'name'
		item.data.should.have_property 'price'
	end
	
	it 'should throw an exception without a type'
		-{Giving.Item.factory({id:'testid2',name:'a name',price:0.99})}.should.throw_error Giving.Error

	end
	
	describe '.setData()'
		it 'should call setters when setting data object'
			item.should.receive('set',4)
			item.setData({type:'Donation',id:'newid',name:'newname',price:999.12})
		end
	end
end

describe 'Giving.Order'
	before_each
		Giving.ObjectRegistry.clear()
		order = new Giving.Order({testoption:'test'})
		order.clear();
		item =  Giving.Item.factory({type:'Donation',id:'TestingOrderItem',name:'Testing Order Item',price:5.23})
	end
	
	it 'should apply options passed to the constructor'
		order.options.should.have_property 'testoption'
		order.options.testoption.should.equal 'test'
	end
	

	
	describe '.addItem()'
		it 'should throw an error if called without an argument'
			-{order.addItem()}.should.throw_error Giving.Error
		end
		it 'should add the item to the items and quantities arrays'
			order.addItem(item)
			order.should.have 1, 'items'
			order.should.have 1, 'quantities'
			order.items[0].should.equal item
		end
		it 'should set the correct quantity'
			order.addItem(item,5)
			order.quantities[0].should.equal 5
		end
		//it 'should '
	end
	
	describe '.addItemById()'
		it 'should throw an error if called without an argument'
			-{order.addItemById()}.should.throw_error Giving.Error
		end
		it 'should throw an error if id is not found'
			-{order.addItemById('nfgdsbnfjkg4398yfb4r3i')}.should.throw_error Giving.Error
		end
		it 'should add the item to the items and quantities arrays'
			order.addItemById('TestingOrderItem')
			order.should.have 1, 'items'
			order.should.have 1, 'quantities'
			order.items[0].should.equal item
		end
		it 'should set the correct quantity'
			order.addItemById('TestingOrderItem',17)
			order.should.have 1, 'items'
			order.should.have 1, 'quantities'
			order.quantities[0].should.equal 17
		end
		
	end
	
	describe '.getItemIndex()'
		it 'should return the correct index for the item'
			order.addItem(item)
			item2 = Giving.Item.factory({type:'Donation',id:'aseconditem',name:'A Second Item'})
			order.addItem(item2)
			order.getItemIndex(item2).should.equal 1
		end
	end
	
	describe '.removeItem()'
		it 'should remove and item and its quantity'
			order.addItem(item)
			order.should.have 1, 'items'
			order.removeItem(item)
			order.should.have 0, 'items'
			order.should.have 0, 'quantities'
		end
		it 'should decrease the items quantity by one when no quantity is specified'
			order.addItem(item,5)
			order.should.have 1, 'items'
			order.quantities[0].should.equal 5
			order.removeItem(item)
			order.quantities[0].should.equal 4
		end
		it 'should remove the item and its quantity when quantity to remove is equal to the item quantity'
			order.addItem(item,5)
			order.should.have 1, 'items'
			order.quantities[0].should.equal 5
			order.removeItem(item,5)
			order.should.have 0, 'items'
			order.should.have 0, 'quantities'			
		end
		it 'should remove the item and its quantity when quantity to remove is greater than the item quantity'
			order.addItem(item,5)
			order.should.have 1, 'items'
			order.quantities[0].should.equal 5
			order.removeItem(item,10)
			order.should.have 0, 'items'
			order.should.have 0, 'quantities'			
		end
	end
	
	describe '.removeItemById()'
		it 'should remove an item and its quantity, referenced by id'
			order.addItem(item)
			order.should.have 1, 'items'
			order.removeItem('TestingOrderItem')
			order.should.have 0, 'items'
			order.should.have 0, 'quantities'			
		end
	end
	
	describe '.setQuantity()'
		it 'should set the quantity for an item'
			order.addItem(item)
			order.should.have 1, 'items'
			order.quantities[0].should.equal 1
			order.setQuantity(item,7)
			order.should.have 1, 'items'
			order.should.have 1, 'quantities'
			order.quantities[0].should.equal 7
		end
	end
	
	describe '.getItems()'
		it 'should return an array of items'
		
		end
	end
	
	describe '.clear()'
		it 'should clear items and quantities'
		
		end
	end
	
	describe '.calculateTotals()'
	
	end
	
	describe '.store()'
	
	end
	
	describe '.load()'
	
	end
	
	
end





a schema wrapper around JavaScript objects

	x - root object in prototypical inheritance framework (i.e. x.Base), and contains all loaded modules
		NO - JUST contains all loaded modules, in controlled manner, i.e. can only add properties to x via x.addModule(id, obj)
		and can't reassign properties.

	x.base - simple objects for prototypical inheritance: Base, OrderedMap, EventStack, etc
	x.data - fields, Fieldset, Entity
	x.page - sections, Page, Tab, Link
	x.io   - HTTP client and server, file managers, XmlStream
	x.log  - logging
	x.sql  - SQL and querying

x.Base 			> x.base.Base
x.Entity		> x.data.Entity (x/Entity)
x.FieldSet		> x.data.FieldSet (x/FieldSet)
x.fields.Text 	> x.data.Text
x.Page 			> x.page.Page
x.Page.Link		> x.page.Link
x.sections.Section > x.page.Section

x.page.Section < x.page.ListBase < x.page.ListGrid

Document-Centric - Entity represents Document




network transaction design - RDBMS data packets

on the browser:

	var trans = y.ui.getTransaction()
	record = trans.getActiveRow(entity_id, key, modifiable)
	record = trans.createNewRow(entity_id, modifiable)
	record = trans.getRow(entity_id, key, modifiable)
	record.addLinkedRows(entity_id, link_field_id, modifiable)

trans has four states:
	A (before send() called, allows 'instructions' to be added)
	B (after send() called but before response received, 'instructions' cannot be added and records cannot be retrieved)
	C (after valid successful response received, 'instructions' cannot be added but records can be retrieved)
	E (after fail response received, transaction is dead and cannot be used further)

In A state, the function calls getActiveRow(), createNewRow(), getRow() and addLinkedRows() all function to add 'instructions'
	to the transaction, being a set of requests for records from the database. The ...Row() functions return 'record' objects
	being clones of the relevant Entity objects, and which will be populated when the successful response is received.

Each instruction is stored within the Transaction object as a simple map, like this:
	{ entity_id: <str>, modifiable: <bool>, key: <str> (if given), link_field_id: <str> (if given), sub_instructions: <array> (if necessary) } 
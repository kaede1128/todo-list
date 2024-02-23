export default class gs {
	constructor() {
		this.GoogleAppsScriptId = "AKfycbw2UpKVFFIcDEKxEpTd_nhcMhxg5cdcHYziNawwO6NmwlnDrwbpH0E_MwCpQexi3Rk-dg"
		this.GoogleSheetId = "1PmSGaEcacXDKymvkgW3oqEdRyIG2OJ8KyWVbXZXhuqI"

	}
	static get() {

	}
	static set(todo = {}) {
		/* todo
		id: this.getRandomId(),
        task: task,
        remark: remark,
        dueDate: this.todoItemFormatter.formatDueDate(dueDate),
        completed: false,
        status: "pending",
        * */
		let name = document.querySelector('#nameValue').value;
		let age = document.querySelector('#ageValue').value;
		todo.SpreadsheetId = this.GoogleSheetId
		console.info(todo)
		$.ajax({
			data: todo,
			url: `https://script.google.com/macros/s/${this.GoogleAppsScriptId}/exec`,
			success: function(response) {
				if(response == "存入成功"){
					alert("存入成功");
				}
			},
		});
	}
	remove() {

	}
}
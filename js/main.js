// Abstract class for TodoItemFormatter
class TodoItemFormatter {
    formatTask(task) {
        return task.length > 30 ? task.slice(0, 30) + "..." : task;
    }

    formatRemark(remark) {
        return '<span class="remark">' + remark + '</span>' || "";
    }

    formatDueDate(dueDate) {
        return dueDate || "No due date";
    }

    formatStatus(completed) {
        return completed ? "Completed" : "Pending";
    }
}

// Class responsible for managing Todo items
class TodoManager {
    constructor(todoItemFormatter) {
        this.todos = JSON.parse(localStorage.getItem("todos")) || [];
        console.info("init Google Actions Script")
        this.todoItemFormatter = todoItemFormatter;
        this.editId = ""
    }

    addTodo(task, dueDate, remark) {
        let id = this.getRandomId()
        let completed = false
        let status = "pending"
        if (this.editId) {
            id = this.editId
            const todo = this.todos.find((t) => t.id === id);
            completed = todo.completed ?? false
            status = todo.completed ? "completed" : "pending"
            this.editId = ""
            this.todos = this.todos.filter((todo) => todo.id !== id);
        }
        const newTodo = {
            id: id,
            task: task,
            remark: remark,
            dueDate: this.todoItemFormatter.formatDueDate(dueDate),
            completed: completed,
            status: status,
        };
        this.todos.push(newTodo);
        this.saveToLocalStorage();
        gs.set(newTodo)
        return newTodo;
    }

    editTodo(id, updatedTask) {
        const todo = this.todos.find((t) => t.id === id);
        if (todo) {
            todo.task = updatedTask;
            this.saveToLocalStorage();
        }
        return todo;
    }

    deleteTodo(id) {
        this.todos = this.todos.filter((todo) => todo.id !== id);
        this.saveToLocalStorage();
        gs.remove(id)
    }

    toggleTodoStatus(id) {
        const todo = this.todos.find((t) => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            todo.status = todo.completed ? "completed" : "pending";
            // gs.remove(todo.id)
            gs.set(todo)
            this.saveToLocalStorage();
        }
    }

    clearAllTodos() {
        if (this.todos.length > 0) {
            this.todos = [];
            this.saveToLocalStorage();
            gs.remove("REMOVE_ALL")
        }
    }

    filterTodos(status) {
        console.info("filter:", status)
        switch (status) {
            case "all":
                return this.todos;
            case "pending":
                return this.todos.filter((todo) => !todo.completed);
            case "completed":
                return this.todos.filter((todo) => todo.completed);
            default:
                return [];
        }
    }

    getRandomId() {
        return (
            +new Date + "@" +
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
        );
    }

    saveToLocalStorage() {
        let _timestamp = (v) => {
            return v.substring(0, v.indexOf('@'))
        }
        this.todos.sort((a, b) => _timestamp(b.id) - _timestamp(a.id))
        localStorage.setItem("todos", JSON.stringify(this.todos));
    }

    cloudImport() {
        gs.get( (v)=>{
            this.todos = JSON.parse(v)
            console.warn(JSON.parse(v))
            uiManager.displayTodos(this.todos)
        } )
    }
    cloudExport() {
        // gs.set(JSON.parse(localStorage.getItem("todos")))
	    // exportAs.txt(JSON.parse(localStorage.getItem("todos")))
    }
}

// Class responsible for managing the UI and handling events
class UIManager {
    constructor(todoManager, todoItemFormatter) {
        this.todoManager = todoManager;
        this.todoItemFormatter = todoItemFormatter;
        this.taskInput = document.querySelector("input");
        this.remarkInput = document.querySelector(".input-remark");
        this.dateInput = document.querySelector(".schedule-date");
        this.addBtn = document.querySelector(".add-task-button");
        this.todosListBody = document.querySelector(".todos-list-body");
        this.alertMessage = document.querySelector(".alert-message");
        this.deleteAllBtn = document.querySelector(".delete-all-btn");

        this.addEventListeners();
        this.showAllTodos();
    }

    addEventListeners() {
        // Event listener for adding a new todo
        this.addBtn.addEventListener("click", () => {
            this.handleAddTodo();
        });

        // Event listener for pressing Enter key in the task input
        this.taskInput.addEventListener("keyup", (e) => {
            if (e.keyCode === 13 && this.taskInput.value.length > 0) {
                this.handleAddTodo();
            }
        });
        this.remarkInput.addEventListener("keyup", (e) => {
            if (e.keyCode === 13 && this.remarkInput.value.length > 0) {
                this.handleAddTodo();
            }
        });

        // Event listener for deleting all todos
        this.deleteAllBtn.addEventListener("click", () => {
            this.handleClearAllTodos();
        });

        // Event listeners for filter buttons
        const filterMenuButton = document.querySelectorAll(".grid .dropdown .swap");
        const filterButtons = document.querySelectorAll(".todos-filter li");
        filterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const status = button.textContent.toLowerCase();
                this.handleFilterTodos(status);
                if (status !== "all") {
                    console.info("notice")
                    if (!filterMenuButton[0].classList.contains("notice"))
                    filterMenuButton[0].classList.add("notice")
                } else {
                    if (filterMenuButton[0].classList.contains("notice"))
                    filterMenuButton[0].classList.remove("notice")
                }
            });
        });
    }

    handleAddTodo() {
        const task = this.taskInput.value;
        const remark = this.remarkInput.value;
        const dueDate = this.dateInput.value;
        if (task === "") {
            this.showAlertMessage("Please enter a task", "error");
        } else {
            const newTodo = this.todoManager.addTodo(task, dueDate, remark);
            this.showAllTodos();
            this.taskInput.value = "";
            this.remarkInput.value = "";
            this.dateInput.value = "";
            this.showAlertMessage("Task added successfully", "success");
        }
    }

    handleClearAllTodos() {
        this.todoManager.clearAllTodos();
        this.showAllTodos();
        this.showAlertMessage("All todos cleared successfully", "success");
    }

    showAllTodos() {
        const todos = this.todoManager.filterTodos("all");
        this.displayTodos(todos);
    }

    displayTodos(todos) {

        this.todosListBody.innerHTML = "";

        if (todos.length === 0) {
            this.todosListBody.innerHTML = `<tr><td colspan="5" class="text-center">No task found</td></tr>`;
            return;
        }

        todos.forEach((todo) => {
            this.todosListBody.innerHTML += `
          <tr class="todo-item" data-id="${todo.id}">
            <td class="${todo.completed? "bg-base-300" : ""}">${this.todoItemFormatter.formatTask(todo.task)}${this.todoItemFormatter.formatRemark(todo.remark)}</td>
            <td class="${todo.completed? "bg-base-300" : ""}">${this.todoItemFormatter.formatDueDate(todo.dueDate)}</td>
            <td class="${todo.completed? "bg-base-300" : ""}">${this.todoItemFormatter.formatStatus(todo.completed)}</td>
            <td class="${todo.completed? "bg-base-300" : ""}">
              <button class="btn btn-warning btn-sm" onclick="uiManager.handleEditTodo('${
                todo.id
            }')">
                <i class="bx bx-edit-alt bx-bx-xs"></i>    
              </button>
              <button class="btn ${todo.completed? "" : "btn-success"} btn-sm" onclick="uiManager.handleToggleStatus('${
                todo.id
            }')">
                <i class="bx bx-${todo.completed? "reset" : "check"} bx-xs"></i>
              </button>
              <button class="btn btn-error btn-sm" onclick="uiManager.handleDeleteTodo('${
                todo.id
            }')">
                <i class="bx bx-trash bx-xs"></i>
              </button>
            </td>
          </tr>
        `;
        });
    }



    handleEditTodo(id) {
        const todo = this.todoManager.todos.find((t) => t.id === id);
        if (todo) {
            this.taskInput.value = todo.task;
            this.remarkInput.value = todo.remark;
            // this.todoManager.deleteTodo(id);
            this.todoManager.editId = id

            const handleUpdate = () => {
                this.addBtn.innerHTML = "<i class='bx bx-plus bx-sm'></i>";
                this.showAlertMessage("Todo updated successfully", "success");
                this.showAllTodos();
                this.addBtn.removeEventListener("click", handleUpdate);
            };

            this.addBtn.innerHTML = "<i class='bx bx-check bx-sm'></i>";
            this.addBtn.addEventListener("click", handleUpdate);
        }
    }


    handleToggleStatus(id) {
        this.todoManager.editId = id
        this.todoManager.toggleTodoStatus(id);
        this.showAllTodos();
    }

    handleDeleteTodo(id) {
        this.todoManager.deleteTodo(id);
        this.showAlertMessage("Todo deleted successfully", "success");
        this.showAllTodos();
    }


    handleFilterTodos(status) {
        const filteredTodos = this.todoManager.filterTodos(status);
        this.displayTodos(filteredTodos);
    }


    showAlertMessage(message, type) {
    /* type<string>: info success warning error */
        console.info(`[!!!] ${type}:`, message)
        const alertBox = `
          <div class="alert alert-${type} shadow-lg mb-5 w-full">
            <div>
              <span>${message}</span>
            </div>
          </div>
        `;
        this.alertMessage.innerHTML = alertBox;
        this.alertMessage.classList.remove("hide");
        this.alertMessage.classList.add("show");
        setTimeout(() => {
            this.alertMessage.classList.remove("show");
            this.alertMessage.classList.add("hide");
        }, 3000);
    }
}

// Class responsible for managing the theme switcher
class ThemeSwitcher {
    constructor(themesListRoot, themes, html) {
        this._themes = [
          "light",
          "dark",
          "cupcake",
          "bumblebee",
          // "emerald",
          // "corporate",
          "synthwave",
          // "retro",
          // "cyberpunk",
          // "valentine",
          "halloween",
          // "garden",
          // "forest",
          "aqua",
          // "lofi",
          // "pastel",
          "fantasy",
          // "wireframe",
          // "black",
          "luxury",
          "dracula",
          // "cmyk",
          // "autumn",
          // "business",
          // "acid",
          // "lemonade",
          "night",
          // "coffee",
          // "winter",
          // "dim",
          // "nord",
          // "sunset",
        ]
        this._themes.push("black", "realdark")
        this.themes = themes;
        this.buildThemesMenu(themesListRoot)
        this.html = html;
        this.init();
    }

    buildThemesMenu(themesListRoot) {
        if (themesListRoot) {
            themesListRoot.innerHTML = ""
            this._themes.forEach( v =>{
                themesListRoot.innerHTML += `<li class="theme-item" theme="${v}"><a>${v}</a></li>`
            })
        }
        this.themes = document.querySelectorAll(".theme-item")
    }

    init() {
        const theme = this.getThemeFromLocalStorage();
        if (theme) {
            this.setTheme(theme);
        }

        this.addThemeEventListeners();
    }

    addThemeEventListeners() {
        this.themes.forEach((theme) => {
            theme.addEventListener("click", () => {
                const themeName = theme.getAttribute("theme");
                this.setTheme(themeName);
                this.saveThemeToLocalStorage(themeName);
            });
        });
    }

    setTheme(themeName) {
        this.html.setAttribute("data-theme", themeName);
    }

    saveThemeToLocalStorage(themeName) {
        localStorage.setItem("theme", themeName);
    }

    getThemeFromLocalStorage() {
        return localStorage.getItem("theme");
    }
}

class GoogleAppsScript {
	constructor() {
		this.GoogleAppsScriptId = "AKfycbzQHn194mT2g9_0fjNlDm6HfXer4ZXlEWIDcWc9YTAuzoRJgWtt71NZUxYpIpEE_Vlp9w"
		this.GoogleSheetId = "1PmSGaEcacXDKymvkgW3oqEdRyIG2OJ8KyWVbXZXhuqI"
		this.GoogleSheetName = "todolist"
        this.url = `https://script.google.com/macros/s/${this.GoogleAppsScriptId}/exec`
	}
    get(cb) {
        loading(true)
        console.info("send google action script request <get>")
        let todo = {}
		todo.SpreadsheetId = this.GoogleSheetId
		todo.SpreadsheetName = this.GoogleSheetName
        todo.action = "GET"
        $.ajax({
            method: "POST",
            data: JSON.stringify(todo),
            url: this.url,
            success: function(response) {
                // console.info(JSON.parse(response))
                // console.info(todoManager.todos)
                // response: JSON.stringify(result)
                if(response || response == []){
                    uiManager.showAlertMessage("Spreadsheet data loaded", "success");
                } else {
                    uiManager.showAlertMessage("Spreadsheet No Data", "info");
                }
                return response
            },
        }).done(function( msg ) {
            loading(false)
            console.info( "Data get: " + msg );
            if (cb && typeof cb === 'function') { cb(msg) }
        });
	}
	set(todo = {}) {
        loading(true)
        console.info("send google action script request <set>")
		/* todo
		id: this.getRandomId(),
        task: task,
        remark: remark,
        dueDate: this.todoItemFormatter.formatDueDate(dueDate),
        completed: false,
        status: "pending",
        * */
/*		let name = document.querySelector('#nameValue').value;
		let age = document.querySelector('#ageValue').value;*/
		todo.SpreadsheetId = this.GoogleSheetId
		todo.SpreadsheetName = this.GoogleSheetName
        todo.action = "SET"
		$.ajax({
            method: 'POST',
			data: JSON.stringify(todo),
			url: this.url,
			success: function(response) {
                console.info(response)
                // response: success#<getMaxRows>
				if(response.includes( "success#")){
                    let last = response.substring(response.indexOf("#")+1)
					uiManager.showAlertMessage("Inserted to Spreadsheet row #" + last, "success");
                } else {
                    uiManager.showAlertMessage("Insert to Spreadsheet failed #" + todo.id, "error");
                }
			},
		}).done(function( msg ) {
            loading(false)
            console.info( "Data Saved: " + msg );
        });
	}
    edit(todo = {}) {
        console.info("send google action script request <set>")
    }
	remove(id = "") {
        /* <string> id | "REMOVE_ALL" */
        console.info("send google action script request <del>")
        let todo = {}
		todo.SpreadsheetId = this.GoogleSheetId
		todo.SpreadsheetName = this.GoogleSheetName
        todo.action = "DEL"
        todo.id = id
        $.ajax({
            method: "POST",
            data: JSON.stringify(todo),
            url: this.url,
            success: function(response) {
                console.info(response)
                // response: remove#<getMaxRows>
				if(response.includes( "remove")){
                    let last = response.substring(response.indexOf("#")+1)
					uiManager.showAlertMessage("Removed Spreadsheet row #" + last, "success");
                } else {
                    uiManager.showAlertMessage("Remove Spreadsheet failed #" + id, "error");
                }
            },
        }).done(function( msg ) {
            console.info( "Data Removed: " + msg );
        });
	}
}

class Exports {
    constructor() {
        this.data = JSON.parse(localStorage.getItem("todos"))
        // JSON
        // XML
        // CSV
        // TXT
        // Excel
        this.BlobConfig = {
            csv: {
                ext: 'csv',
                mime: 'text/csv;charset=utf-8,'
            },
            txt: {
                ext: 'txt',
                mime: 'text/plain;charset=utf-8,'
            }
        }
        // MIME type	Description
        // text/plain	Plain text document
        // text/html	HTML document
        // text/javascript	JavaScript file
        // text/css	CSS file
        // application/json	JSON file
        // application/pdf	PDF file
        // application/xml	XML file
        // image/jpeg	JPEG image
        // image/png	PNG image
        // image/gif	GIF image
        // image/svg+xml	SVG image
        // audio/mpeg	MP3 file
        // video/mpeg	MP4 file
        this.unprint = [
            // "id", ...
            "SpreadsheetId",
            "SpreadsheetName",
            "action",
        ]
    }
    pureData(_data = this.data) {
        _data.forEach(v => {
            this.unprint.forEach(k => delete v[k])
        })
        return _data
    }
    csv(_data) { // [{k,v}, ...]
        _data = this.pureData(_data)
        const titleKeys = Object.keys(_data[0])
        const refinedData = [] // like a table
        refinedData.push(titleKeys)
        _data.forEach(item => { refinedData.push(Object.values(item)) })
        let content = ''
        refinedData.forEach(row => { content += row.join(',') + '\n' })
        // console.info("csvContent", content)
        this.process(content, this.BlobConfig.csv)
    }
    txt(_data) { // [{k,v}, ...]
        _data = this.pureData(_data)
        const refinedData = [] // like a table
        const hr = '\n\n=== === ===\n\n'
        _data.forEach(item => {
            let temp =[]
            Object.entries(item).forEach(value => {
                temp.push(value.join(': '))
            })
            refinedData.push(temp)
        })
        let content = hr
        refinedData.forEach(row => { content += row.join('\n') + hr })
        // console.info("txtContent", content)
        this.process(content, this.BlobConfig.txt)
    }
    process(blobParts, type) {
        // return // Testing
        const blob = new Blob([blobParts], { type: type.mime })
        const objUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', objUrl)
        link.setAttribute('download', `export_${new Date().toLocaleString('en-CA',{ hour12: false }).replaceAll(/\D/g,'')}.${type.ext}`)
        link.click()
        // link.textContent = 'Click to Download'
        // document.querySelector('body').append(link)
    }
}


// Instantiating the classes
const gs = new GoogleAppsScript();
const exportAs = new Exports();
const todoItemFormatter = new TodoItemFormatter();
const todoManager = new TodoManager(todoItemFormatter);
const uiManager = new UIManager(todoManager, todoItemFormatter);
const themesListRoot = document.querySelector(".theme-switcher .dropdown ul");
const themes = document.querySelectorAll(".theme-item");
const html = document.querySelector("html");
const themeSwitcher = new ThemeSwitcher(themesListRoot, themes, html);

// document.querySelectorAll(".dropdown .swap-active").forEach(v => {
//     v.addEventListener("click", () => {
//         console.info("clicked")
//         if (v.classList.contains("swap-active")) v.blur()
//     })
// })

document.querySelectorAll(".dropdown .swap").forEach(v => {
    v.addEventListener("click", () => {
        if (v.classList.contains("swap-active")) {
            v.classList.remove("swap-active")
            v.blur()
        } else {
            if (!v.classList.contains("swap-active")) v.classList.add("swap-active")
        }
    })
    v.addEventListener("focusout", () => {
        if (v.classList.contains("swap-active")) v.classList.remove("swap-active")
     })
})

// loading(true) // dummy
function loading(status) {
    const modal_loading = document.querySelector("#modal_loading")
    if (status)
        modal_loading.classList.add("modal-open")
    else
        modal_loading.classList.remove("modal-open")
}
document.querySelector("#modal_loading").addEventListener("click", () => {
    loading(false)
})
document.querySelector("#modal_loading").addEventListener("click", () => {
    loading(false)
})
document.querySelectorAll(".modal").forEach(v => {
    v.addEventListener("click", () => {
        v.querySelector("form .btn").click()
    })
})
document.querySelectorAll(".modal-box").forEach(v => {
    v.addEventListener("click", (e) => {
        e.stopPropagation()
    })
})
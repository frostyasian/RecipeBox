//global variables
var box = $("#box"); //add items with .append();
var storage = $("#storage"); //store hidden items here - modals and dialouges
var alert = $("#alert");

//A function that handles css class designation for the active tab in the recipe box
function toggleActiveTab(tab) {
  $("#tab-all").removeClass("active-tab");
  $("#tab-select").removeClass("active-tab");

  tab.addClass("active-tab");
}

function displayRecipe(recipe, element, isSaved) {
  var cardTabLabel = "save recipe to...";
  //grab the modal stored in the storage div
  var modal = $("#recipe-display-modal");
  $("#save-recipe-button").attr("data-index", element.attr("data-index"));
  if (isSaved) {
    cardTabLabel = $("#tab-label").text();
    $("#save-recipe-button").attr("data-key", element.attr("data-key"));
    $("#delete-recipe-button").prop("disabled", false);
  } else {
    $("#delete-recipe-button").prop("disabled", true);
  }
  //populate the recipe-specific data to the modal
  $("#recipe-modal-image").attr("src", recipe.image);

  //label the dropdown with help text
  $("#card-tab-label").text(cardTabLabel);
  //update the recipe title
  $("#recipe-modal-title").text(recipe.label);
  //update the recipe time

  $("#recipe-modal-time").text(formatTime(recipe.totalTime));
  //update the recipe ingredients
  var ingredients = recipe.ingredientLines;
  var list = $("#recipe-modal-ingredients");
  list.empty();
  if (ingredients.length === 1) {
    //handle single string of ingredients here
  }
  ingredients.forEach(ingredient => {
    list.append("<li>" + ingredient + "</li>");
  });
  //update the recipe external link
  var link = $("#recipe-modal-link");
  link.attr("href", recipe.url);
  var host = recipe.url.split(".")[1];
  link.text(host + " - " + recipe.label);
  var source = parseInt(element.attr("data-source"));
  $("#save-recipe-button").attr("data-source", source + "");
  //index tells me where the div should go in the results pane
  //the goal here is a google-image-like experience

  if (!source) {
    modal.detach().insertAfter(element);
  } else {
    modal.detach().prependTo($(".results"));
  }
}

//this function takes in a collection of recipes as a JSON object as well as an array of keys for each of the
//recipes stored in the object.
function updateRecipeBox(recipeObject, keys) {
  $("#content").empty();
  keys.forEach(function(key, index) {
    var label = recipeObject[key].label;
    var imgURL = recipeObject[key].image;
    var time = recipeObject[key].totalTime;
    var insert = $("<div>")
      .addClass("recipe-card-insert")
      .attr("data-key", key)
      .attr("data-source", "1");
    var image = $("<img>")
      .attr("src", imgURL)
      .addClass("recipe-image-tiny");
    var timestring = formatTime(time);
    var div = $("<div>")
      .addClass("recipe-insert-info")
      .append("<div>" + label + "</div>", "<div>" + timestring + "</div>");
    insert.append(image, div).appendTo($("#content"));
  });
}

//a function that takes in a time string from the recipe object and retuns a formatted time string for display
//the formatted time string is <hours> 'hours' + <minutes> 'minutes'
function formatTime(time) {
  //turn the time string into an integer and compute the hours and minutes
  var timeInMinutes = parseInt(time);
  //only compute the hours and minutes if time is nonzero
  if (timeInMinutes !== 0) {
    var hours = Math.floor(timeInMinutes / 60);
    var minutes = Math.round(timeInMinutes % 60);
    if (hours === 0) {
      return minutes + " minutes";
    }
    return hours + " hours " + minutes + " minutes";
  }
  return "- minutes";
}

//a function that loads the recipe box for a user / guest and closes the box modal after login
function flowPastLogin(self) {
  //console.log(self);
  self.detach().appendTo($("#storage"));
  $("#recipe-box")
    .detach()
    .appendTo($("#box"));
  $("#box-click").trigger("click");
}

function layoutTabs(tabs, index = 0) {
  var boxTabDiv = $("#tab-select");
  var boxTabLabel = $("#tab-label");
  var cardTabDiv = $("#card-tab-select");
  var cardTabLabel = $("#card-tab-label");
  var deleteTabDialogue = $("#tab-delete-dialogue");
  if (recipeTabs.length === 0) {
    // console.log("no tabs to display");
  }
  boxTabLabel.detach().text(tabs[index]);
  cardTabLabel.detach().text(tabs[index]);
  boxTabDiv.empty();
  cardTabDiv.empty();
  deleteTabDialogue.empty();
  tabs.forEach(function(tab, dex) {
    var boxtab = $("<div>")
      .text(tab)
      .addClass("tab-option")
      .attr("value", dex + "");
    boxTabDiv.append(boxtab);
    var cardtab = $("<div>")
      .text(tab)
      .addClass("card-tab-option")
      .attr("value", dex + "");
    cardTabDiv.append(cardtab);
    //build the tab delete dialouges
    var delbtn = $("<span>")
      .addClass("delete-tab")
      .text("x")
      .attr("data-tab", tab);
    var delTabDiv = $("<div>")
      .text(tab)
      .append(delbtn)
      .addClass("del-tab-row");
    deleteTabDialogue.append(delTabDiv);
  });
  boxTabLabel.prependTo(boxTabDiv);
  cardTabLabel.prependTo(cardTabDiv);
}

function loadRecipes(tabname) {
  userRecipeBoxRef.child(tabname).once("value", function(snapshot) {
    var recipeObject = snapshot.val();
    if (recipeObject === null) {
      var p = $("<div>")
        .addClass("no-recipe-message")
        .text(
          "You don't have any recipes saved here. Try searching and adding some"
        );
      $("#content")
        .empty()
        .append(p);
      //console.log("no recipes to display");
      return;
    }
    var keys = Object.keys(recipeObject);
    updateRecipeBox(recipeObject, keys);
  });
}

//a function that looks for a specific, known key format issue in the totalNutrients object of a recipe
//viz, SUGAR.added
function scrubKeys(object) {
  var nutrientKeys = Object.keys(object.totalNutrients);
  if (nutrientKeys.includes("SUGAR.added")) {
    try {
      object.totalNutrients["SUGAR_added"] =
        object.totalNutrients["SUGAR.added"];
      delete object.totalNutrients["SUGAR.added"];
    } catch (error) {
      console.log(error.message);
    }
  }
  return object;
}

function saveRecipeToCurrentTab(dragObject) {
  var label = $("#tab-label").text();

  saveRecipe(dragObject, label);
}

function allowDrop(ev) {
  ev.preventDefault();
}

// see also buildCard in search.js
function drag(ev) {
  // set what gets passed to target
  //  ev.dataTransfer.setData("text", ev.target.id); // original example code
  ev.dataTransfer.setData("text", ev.target.getAttribute("data-index")); // data-index is the index of this card in the search results
}

function drop(ev) {
  ev.preventDefault();
  var searchResultIndex = ev.dataTransfer.getData("text");
  //console.log("drop event handler - searchResultIndex: '" + searchResultIndex + "'");
  saveRecipeToCurrentTab(searchResultIndex);
}

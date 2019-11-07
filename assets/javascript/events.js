// This file holds listeners for click and key events only

//document level events are events triggered on the document
//the event listeners that follow are organized by document level execution
//events triggerd and handled by the document come first. Events triggered by the document
//that are filtered down to the element level come second

//an enter key listener that allows a user to use the enter key to trigger form submission
//or advance through authenticaion flow
$(document).on("keyup", function(event) {
  if (event.keyCode !== 13) return; //only perform the following code block if the enter key is pressed
  //get the object that has focus and determine what action needs to be taken
  var activeElement = $(document.activeElement);
  var targetId = activeElement.attr("id");

  if (targetId === "recipe-search") {
    $("#search-icon").trigger("click");
  } else if (targetId === "sign-in-email") {
    $("#sign-in-password").focus();
  } else if (targetId === "sign-in-password") {
    $("#sign-in").trigger("click");
  } else if (targetId === "custom-tab-input") {
    $("#tab-okay-icon").trigger("click");
  }
});

//A listener to handle clicks on dynamicalyy populated tab dropwdowns for the recipe-box
$(document).on("click", ".tab-option", function() {
  //console.log("tab click event fired");
  var index = parseInt($(this).attr("value"));
  var tabname = recipeTabs[index];
  // console.log(index + ", " + tabname);
  $("#tab-label").text(tabname);
  $("#tab-select").attr("value", index + "");
  loadRecipes(tabname);
});

//A listener to handle clicks on dynamicalyy populated tab dropwdowns for the recipe-display modal
$(document).on("click", ".card-tab-option", function() {
  var index = parseInt($(this).attr("value"));
  $("#card-tab-label").text(recipeTabs[index]);
  $("#card-tab-select").attr("value", index + "");
});

//a couple of global variables to bypass the drag event
var dragObject;
var dragData;
//a listener to handle drag events on cards -- as Tom mentioned, this is buggy and it seems like only
//the image is able to be dragged... not sure why. DEBUG required.
$(document).on("dragstart", ".card", function() {
  dragData = parseInt($(this).attr("data-index"));
  dragObject = searchResults[dragData];
  dragObject = scrubKeys(dragObject);
});

//a listener that will allow an object to be dropped within the contents pane of the recipe box
$("#content").on("dragover", function(event) {
  event.preventDefault();
});

//a listener that will handle the drop event
$("#content").on("drop", function(event) {
  //  saveRecipe(dragObject, $("#tab-label").text());
  saveRecipeToCurrentTab(dragObject);
});

//a listener to handle clicks on a dynamically created div displayed at the end of the search results.
//the div acts like a button to load more results.
$(document).on("click", ".load-more", function() {
  displayResults(false);
});
//The following click events are a subset of filtered events on the DOM that deal exclusively with
//authentication modal layout and submission

//swap the auth-in and auth-up modals on the fly when a user clicks the divs. This filter is needed
//because the div exists in two different modals with unique ids
$(document).on("click", "#swap-auth-in,#swap-auth-up", function() {
  var inModal = $("#auth-modal-in");
  var upModal = $("#auth-modal-up");
  var storage = $("#storage");
  var box = $("#box");
  var swapTo = $(this)
    .attr("id")
    .split("-")
    .pop();
  if (swapTo === "up") {
    inModal.detach().appendTo(storage);
    upModal.detach().appendTo(box);
  } else {
    inModal.detach().appendTo(box);
    upModal.detach().appendTo(storage);
  }
});

//A click listener that filters down to search result cards or stored recipe cards. When either of these
//elements are clicked, the recipe is displayed as a bar in the results div.
$(document).on("click", ".card,.recipe-card-insert", function() {
  //data-source points to the array where the recipe information is stored
  var source = parseInt($(this).attr("data-source"));
  var element = $(this);
  // console.log(source);
  switch (source) {
    case 0:
      displayRecipe(searchResults[parseInt($(this).attr("data-index"))], element, false);
      break;
    case 1:
      var key = element.attr("data-key");
      // console.log(key);
      var tab = $("#tab-label").text();
      // console.log(tab);
      userRecipeBoxRef
        .child(tab)
        .child(key)
        .once("value", function(snapshot) {
          var recipe = snapshot.val();
          displayRecipe(recipe, element, true);
        });

      break;
    default:
      return;
  }
});

//a click listener to log a user out. This listener is filtered because the logout link is not always displayed
// on the page.
$(document).on("click", "#logout", function() {
  firebase
    .auth()
    .signOut()
    .then(function() {
      updateData(userProfileRef, { isActive: false });
      //clear the results div - this is a fix to the click events being stripped off of recipes that are still displayed after logout
      $(".search-bar")
        .detach()
        .insertAfter($(".gap1"));
      $(".results").empty();
      //TODO - we can add the animation that Zuoyi built back in, maybe?
      //console.log("user signed out");
      //Any action to perform if a user signs out
    });
});

//a click listener to delete a tab

$(document).on("click", ".delete-tab", function() {
  // <div id="auth-alert-up" class="hidden alert ">Some Alert Message</div>
  var okay = $("<button>")
    .attr("id", "delete-tab-okay")
    .text("okay")
    .attr("data-tab", $(this).attr("data-tab"));
  var cancel = $("<button>")
    .attr("id", "delete-tab-cancel")
    .text("cancel");
  var buttonbox = $("<div>")
    .attr("id", "delete-tab-buttons")
    .append(cancel, okay);
  var alert = $("<div>")
    .addClass("alert")
    .attr("id", "tab-delete-alert")
    .text("WARNING. Deleting this tab will remove all saved recipes in this location. You cannot undo this.")
    .append(buttonbox);
  $($(this).parent()).after(alert);
});

//a listener for the tab-delete-okay button
$(document).on("click", "#delete-tab-okay", function() {
  //delete the tab from the database
  var tab = $(this).attr("data-tab");
  //get the tab out of the recipeTabs array
  var dex = recipeTabs.indexOf(tab);
  var temp = [];
  for (var i = 0; i < dex; i++) {
    temp.push(recipeTabs.shift());
  }
  recipeTabs.shift();
  while (temp.length > 0) {
    recipeTabs.push(temp.pop());
  }
  recipeTabs.sort();
  if (recipeTabs.length === 0) {
    $("#tab-select").text("");
  }
  userRecipeBoxRef
    .child(tab)
    .remove()
    .then(function() {
      userProfileRef
        .update({
          tabs: recipeTabs
        })
        .then(function() {
          layoutTabs(recipeTabs, 0);
          $("#tab-delete-alert").remove();
        })
        .catch(function(err) {
          displayError(err.code, err.message);
          console.log("ERROR -" + err.code + ": " + err.message);
        });
    })
    .catch(function(err) {
      displayError(err.code, err.message);
      console.log("ERROR -" + err.code + ": " + err.message);
    });
  //remove the warning from the modal
});

//a listener for the tab-delete-cancel button
$(document).on("click", "#delete-tab-cancel", function() {
  //remove the warning modal
  $("#tab-delete-alert").remove();
});
//a listener to log a user in anonymously. This filter is needed
//because the div exists in two different modals with unique ids
$(document).on("click", "#guest-auth-in,#guest-auth-up", function() {
  guestSignIn();
});

//element level click events are events that are assigned directly to elements in the DOM
//if the elements are removed from the DOM, the event listeners are destroyed.

//An authenticaion listener to sign in a user
$("#sign-in").on("click", function(event) {
  event.preventDefault();
  var email = $("#sign-in-email")
    .val()
    .trim();
  var password = $("#sign-in-password")
    .val()
    .trim();
  login(email, password);
});

//An authenticaion listener to sign up a user - this method should only be reachable for
//anonymous user present or no user present states. A logged in user should never reach this function.
$("#sign-up").on("click", function(event) {
  event.preventDefault();

  var userName = $("#sign-up-name")
    .val()
    .trim();
  if (userName.length === 0) {
    var alert = $("#auth-alert-up");
    var uNameField = $("#sign-up-name");
    alert
      .text("you must provide a user name")
      .toggleClass("hidden")
      .toggleClass("bad");
    uNameField.toggleClass("error");
    setTimeout(function() {
      uNameField.toggleClass("error");
      alert.toggleClass("hidden").toggleClass("bad");
    }, 3000);
    return;
  }
  var email = $("#sign-up-email")
    .val()
    .trim();
  var password = $("#sign-up-password")
    .val()
    .trim();

  if (currentUser && currentUser.isAnonymous) {
    linkGuestToAccount(email, password, userName);
  } else {
    createNewUser(email, password, userName);
  }
});

//#box-click is area of the page where "welcome" or the user name appears
//clicking on this element with expand / collapse the sidebar div with identifier #box
$("#box-click").on("click", function() {
  var isShowing = parseInt(box.attr("data-showing"));
  if (isShowing) {
    box.css("width", "0px").attr("data-showing", "0");
    $("#box-gap").css("width", "0px");
  } else {
    box.css("width", "405px").attr("data-showing", "1");
    $("#box-gap").css("width", "395px");
  }
});

//the tab-plus-icon is within the recipe-box modal. When clicked, a dialogue is displayed
//that alows users to add a custom tab. If the dialogue is showing, this click function hides the dialogue
$("#tab-plus-icon").on("click", function() {
  var dialogue = $("#custom-tab-dialogue");
  var isShowing = parseInt(dialogue.attr("data-state"));
  if (isShowing) {
    dialogue.css("display", "none").attr("data-state", "0");
  } else {
    dialogue.css("display", "flex").attr("data-state", "1");
  }
});

//the tab-okay-icon lives within the cutom tab dialog. When clicked, a custom tab is added
//to the tab dropdown menus and the custom tab dialogue is closed
$("#tab-okay-icon").on("click", function() {
  //get the name of the new tab
  var tabname = $("#custom-tab-input")
    .val()
    .trim();
  //store the tab name in the user profile =>
  //first pull down the stored tabs from the database
  userProfileRef
    .once("value", function(snapshot) {
      //console.log("pulling tabs down from firebase");
      //assign a reference to the tabs array
      recipeTabs = snapshot.val().tabs;
      if (recipeTabs === undefined) {
        recipeTabs = [];
      }
      //add the new tab to the array
      recipeTabs.push(tabname);
      //then sort the tabs alphabetically
      recipeTabs.sort();
      //then update the database
      updateData(userProfileRef, {
        tabs: recipeTabs
      });
      //update the tabs in the recipe box and snap to the index of the most recent tab
      var tabIndex = recipeTabs.indexOf(tabname);
      layoutTabs(recipeTabs, tabIndex);
      loadRecipes(tabname);
    })
    .catch(function(err) {
      console.log("ERROR -" + err.code + ": " + err.message);
    });
  $("#custom-tab-input").val("");
  //layoutCustomTabs();
  $("#tab-plus-icon").trigger("click");
});

//the tab cancel icon lives in the custom tab dialog. When clicked, the add custom tab dialogue
//input is cleared, the dialogue is closed and no action is performed.
$("#tab-cancel-icon").on("click", function() {
  //we'll add a new tab string to the recipeTabs array, then build a new tab and append it to the div
  $("#custom-tab-input").val("");
  $("#tab-plus-icon").trigger("click");
});

//the tab-select element lives in the recipe-box modal and contains a label as its first child
//followed by a list of available tabs (both default and custom). Clicking on the tab expands a
//dropdown of clickable divs for the user to select a new tab. Clicking on the tab with the dropdown
//showing will close the dropdown.
$("#tab-select").on("click", function() {
  var isShowing = parseInt($(this).attr("data-state"));
  var max = $(window).height() - 93;
  var height =
    36 *
    $(this)
      .children()
      .toArray().length;
  if (height === 0) {
    height = 36;
  }
  if (isShowing) {
    $(this)
      .css("height", "36px")
      .attr("data-state", "0");
    toggleActiveTab($(this));
  } else {
    if ($(this).hasClass("active-tab")) {
      $(this).removeClass("active-tab");
    }
    if (height < max) {
      $(this)
        .css("height", height + "px")
        .attr("data-state", "1");
    } else {
      $(this)
        .css("height", max + "px")
        .attr("data-state", "1");
    }
  }
});

//the card-tab-select element lives on the recipe details modal
//the element contains a label as its first child followed by a list of abailable tabs (both default and custom)
//Clicking on the tab expands the dropdown div contaiing all of the avialalbe tabs stored in the recipeTabs array
//Clicking on the expanded div will collapse the dropdown.
$("#card-tab-select").on("click", function() {
  var isShowing = parseInt($(this).attr("data-state"));
  if (isShowing) {
    $(this)
      .css("height", "24px")
      .attr("data-state", "0");
  } else {
    $(this)
      .css("height", "auto")
      .attr("data-state", "1");
  }
});

//The card-tab-cancel-icon lives on the recipe details modal. Clicking on the icon closes the modal.
$("#card-tab-cancel-icon").on("click", function() {
  $("#recipe-display-modal")
    .detach()
    .appendTo($("#storage"));
});

//the save-recipe-button element lives on the recipe display modal. CLicking it will assign
//the current recipe to the selected tab on the card. The modal will also close.
$("#save-recipe-button").on("click", function() {
  var newtab = $("#card-tab-label").text();
  //if the recipe exists on the server
  if (parseInt($(this).attr("data-source"))) {
    //if data-source === 1
    var key = $(this).attr("data-key");
    var oldtab = $("#tab-label").text();
    userRecipeBoxRef
      .child(oldtab)
      .child(key)
      .once("value", function(snapshot) {
        var recipe = snapshot.val();
        saveRecipe(recipe, newtab);
        deleteRecipe(oldtab, key);
      })
      .catch(function(err) {
        console.log("ERROR -" + err.code + ": " + err.message);
      });
  } else {
    var newRecipe = searchResults[$(this).attr("data-index")];
    //save the newRecipe to the local cache and the server using saveRecipe in data.js
    //Edamam uses dot notation in their keys. when attempting to push a recipe to the server
    //a validation error is thrown. I have handled the specific instance of this problem
    //but a more general solution is required.
    var recipe = scrubKeys(newRecipe);
    saveRecipe(recipe, newtab);
  }

  $("#content").empty();
  $("#recipe-display-modal")
    .detach()
    .appendTo($("#storage"));
  var index = recipeTabs.indexOf(newtab);
  $("#tab-label").text(newtab);
  $("#tab-select").attr("value", index + "");
});

//the delete-recipe-button element lives on the recipe display modal. If a recipe is being displayed
//from search results, the delete button is disabled. If the recipe is being displayed from the recipe box,
//the delte button is enabled, CLicking the button removes the recipe from the database.
$("#delete-recipe-button").on("click", function() {
  var tab = $("#card-tab-label").text();
  var key = $("#save-recipe-button").attr("data-key");
  deleteRecipe(tab, key);
  $("#recipe-display-modal")
    .detach()
    .appendTo($("#storage"));
});

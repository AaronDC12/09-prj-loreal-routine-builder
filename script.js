document.addEventListener("DOMContentLoaded", () => {
  /* Get references to DOM elements */
  const categoryFilter = document.getElementById("categoryFilter");
  const productsContainer = document.getElementById("productsContainer");
  const chatForm = document.getElementById("chatForm");
  const chatWindow = document.getElementById("chatWindow");
  const selectedProductsList = document.getElementById("selectedProductsList");
  const generateRoutineButton = document.getElementById(
    "generateRoutineButton"
  );
  const searchInput = document.getElementById("productSearch"); // Reference to the search input field

  /* Show initial placeholder until user selects a category */
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      Select a category to view products
    </div>
  `;

  /* Load product data from JSON file */
  async function loadProducts() {
    const response = await fetch("products.json");
    const data = await response.json();
    return data.products;
  }

  /* Track selected products */
  let selectedProducts = [];

  /* Create HTML for displaying product cards */
  function displayProducts(products) {
    productsContainer.innerHTML = products
      .map(
        (product) => `
      <div class="product-card" data-id="${product.id}">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>
          <button class="toggle-description">Show Description</button>
          <p class="product-description" style="display: none;">${product.description}</p>
        </div>
      </div>
    `
      )
      .join("");

    // Add event listeners for product selection and description toggle
    document.querySelectorAll(".product-card").forEach((card) => {
      card.addEventListener("click", handleProductSelection);
    });
    document.querySelectorAll(".toggle-description").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent triggering card selection
        const description = button.nextElementSibling;
        description.style.display =
          description.style.display === "none" ? "block" : "none";
        button.textContent =
          description.style.display === "none"
            ? "Show Description"
            : "Hide Description";
      });
    });
  }

  /* Handle product selection */
  function handleProductSelection(e) {
    const card = e.currentTarget;
    const productId = card.dataset.id;

    // Check if product is already selected
    const productIndex = selectedProducts.findIndex(
      (product) => product.id === productId
    );

    if (productIndex === -1) {
      // Add product to selected list
      const product = {
        id: productId,
        name: card.querySelector("h3").textContent,
      };
      selectedProducts.push(product);
      card.classList.add("selected");
    } else {
      // Remove product from selected list
      selectedProducts.splice(productIndex, 1);
      card.classList.remove("selected");
    }

    updateSelectedProducts();
  }

  /* Update the "Selected Products" section */
  function updateSelectedProducts() {
    selectedProductsList.innerHTML = selectedProducts
      .map(
        (product) => `
      <div class="selected-product" data-id="${product.id}">
        <span>${product.name}</span>
        <button class="remove-product">Remove</button>
      </div>
    `
      )
      .join("");

    // Add event listeners for removing products
    document.querySelectorAll(".remove-product").forEach((button) => {
      button.addEventListener("click", (e) => {
        const productId = button.parentElement.dataset.id;
        selectedProducts = selectedProducts.filter(
          (product) => product.id !== productId
        );
        document
          .querySelector(`.product-card[data-id="${productId}"]`)
          .classList.remove("selected");
        updateSelectedProducts();
      });
    });
  }

  /* Filter and display products when category or search changes */
  async function filterAndDisplayProducts() {
    const products = await loadProducts();
    const selectedCategory = categoryFilter.value.toLowerCase();
    const searchQuery = searchInput.value.toLowerCase();

    // Filter products by category and search query
    const filteredProducts = products.filter((product) => {
      const matchesCategory =
        !selectedCategory ||
        product.category.toLowerCase() === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery) ||
        product.description.toLowerCase().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });

    displayProducts(filteredProducts);
  }

  // Update products when the category filter changes
  categoryFilter.addEventListener("change", filterAndDisplayProducts);

  // Update products as the user types in the search field
  searchInput.addEventListener("input", filterAndDisplayProducts);

  /* Track chat history */
  let chatHistory = [];

  /* Generate routine when "Generate Routine" button is clicked */
  generateRoutineButton.addEventListener("click", async () => {
    if (selectedProducts.length === 0) {
      chatWindow.innerHTML = `<p>Please select at least one product to generate a routine.</p>`;
      return;
    }

    // Display a "Generating routine..." message
    chatWindow.innerHTML = `<p>Generating routine...</p>`;

    // Prepare data for the Cloudflare Worker
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful assistant specializing in beauty routines. Use web search to provide the most up-to-date information about L’Oréal products.",
      },
      {
        role: "user",
        content: `Generate a personalized routine using these products: ${JSON.stringify(
          selectedProducts
        )}`,
      },
    ];

    console.log("Sending messages to worker:", messages); // Log the messages array

    try {
      // Send the request to the Cloudflare Worker
      const response = await fetch(
        "https://loreal-routine-builder.dcunh1a.workers.dev/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Check if the response contains the expected structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Unexpected response structure from the worker");
      }

      const routine = data.choices[0].message.content;

      // Display the generated routine in the chat window
      chatWindow.innerHTML = `<p>${routine}</p>`;
      chatHistory = [...messages, { role: "assistant", content: routine }];
    } catch (error) {
      console.error("Error generating routine:", error);
      chatWindow.innerHTML = `<p>There was an error generating your routine. Please try again later.</p>`;
    }
  });

  /* Chat form submission handler for follow-up questions */
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userMessage = e.target.elements["chatInput"].value.trim();
    if (!userMessage) return;

    // Display user's question in the chat window
    chatWindow.innerHTML += `<p><strong>You:</strong> ${userMessage}</p>`;
    chatHistory.push({ role: "user", content: userMessage });

    try {
      // Send the chat history to the Cloudflare Worker
      const response = await fetch(
        "https://loreal-routine-builder.dcunh1a.workers.dev/",
        {
          method: "POST", // Confirmed: POST method is used
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: chatHistory }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Check if the response contains the expected structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Unexpected response structure from the worker");
      }

      const aiResponse = data.choices[0].message.content;

      // Display AI's response in the chat window
      chatWindow.innerHTML += `<p><strong>AI:</strong> ${aiResponse}</p>`;
      chatHistory.push({ role: "assistant", content: aiResponse });
    } catch (error) {
      console.error("Error in chat response:", error);
      chatWindow.innerHTML += `<p>There was an error processing your question. Please try again later.</p>`;
    }

    // Clear the chat input field
    e.target.elements["chatInput"].value = "";
  });

  /* Add RTL and LTR toggle functionality */
  const rtlToggle = document.getElementById("rtlToggle");
  const ltrButton = document.getElementById("ltrButton");

  rtlToggle.addEventListener("change", (e) => {
    const isRTL = e.target.checked;
    document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");

    // Adjust layout for RTL mode
    productsContainer.style.flexDirection = isRTL ? "row-reverse" : "row";
    selectedProductsList.style.flexDirection = isRTL ? "row-reverse" : "row";
    chatWindow.style.textAlign = isRTL ? "right" : "left";
  });

  ltrButton.addEventListener("click", () => {
    rtlToggle.checked = false;
    document.documentElement.setAttribute("dir", "ltr");

    // Reset layout to LTR mode
    productsContainer.style.flexDirection = "row";
    selectedProductsList.style.flexDirection = "row";
    chatWindow.style.textAlign = "left";
  });
});

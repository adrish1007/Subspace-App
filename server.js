// Import necessary modules
const express = require("express");
const axios = require("axios");
const _ = require("lodash");
const { createSelector } = require("reselect");

// Create an Express application
const app = express();
const port = process.env.PORT || 4000;

// Middleware to handle Cross-Origin Resource Sharing (CORS)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Function to fetch blog data from a remote API
const fetchBlogData = async (req, res, next) => {
  try {
    // Define the API endpoint and admin secret key
    const url = "https://intent-kit-16.hasura.app/api/rest/blogs";
    const adminSecret =
      "32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6";

    // Make an HTTP GET request to fetch blog data
    const response = await axios({
      method: "get",
      url,
      headers: {
        "x-hasura-admin-secret": adminSecret,
      },
    });

    // Check if the request was successful
    if (response.status !== 200) {
      throw new Error("Failed to fetch blog data");
    }

    // Store the fetched blog data in the request object
    req.blogData = response.data.blogs;

    next();
  } catch (err) {
    // Handle errors and send a 500 Internal Server Error response
    console.error(err); // Log the error for debugging purposes
    res.status(500).json({ error: err });
  }
};

// Create memoized selectors for analytics and search results
const memoizedAnalytics = createSelector(
  (state) => state.blogData,
  (blogData) => {
    console.log("Calculating analytics");
    const totalBlogs = blogData.length;
    const blogWithLongestTitle = _.maxBy(blogData, (blog) => blog.title.length);
    const blogsWithPrivacy = _.filter(blogData, (blog) =>
      _.includes(_.toLower(blog.title), "privacy")
    );

    const uniqueBlogTitles = _.uniqBy(blogData, "title").map(
      (blog) => blog.title
    );
    console.log("Calculated analytics");
    return {
      totalBlogs,
      blogWithLongestTitle,
      numberOfBlogsWithPrivacy: blogsWithPrivacy.length,
      uniqueBlogTitles,
    };
  }
);

const memoizedSearch = createSelector(
  (state) => state.blogData,
  (state) => state.query,
  (blogData, query) => {
    console.log("Calculating search results");
    var filteredBlogs = blogData.filter((blog) =>
      _.includes(_.toLower(blog.title), _.toLower(query))
    );

    filteredBlogs = filteredBlogs.map((blog) => blog.title);

    console.log("Calculated search results");
    return {
      "Number of blogs found matching the Query string": filteredBlogs.length,
      filteredBlogs: filteredBlogs,
    };
  }
);

// Define API routes

// Route for fetching blog statistics
app.get("/api/blog-stats", fetchBlogData, (req, res) => {
  try {
    const blogData = req.blogData;
    if (!blogData) {
      throw new Error("Failed to fetch blog data");
    }

    // Calculate analytics using the memoized selector
    const analyticsResults = memoizedAnalytics({ blogData });

    // Send the analytics results as JSON response
    res.json({
      analyticsResults,
    });
  } catch (err) {
    // Handle errors and send a 500 Internal Server Error response
    console.error(err);
    res.status(500).json({ error: err });
  }
});

// Route for performing blog searches
app.get("/api/blog-search", fetchBlogData, (req, res) => {
  try {
    const blogData = req.blogData;
    const { query } = req.query;
    if (query == null) res.send("Please enter a query string in the URL");
    else {
      // Perform a search using the memoized selector
      const searchResults = memoizedSearch({ blogData, query });

      // Send the search results as JSON response
      res.json({
        searchResults,
      });
    }
  } catch (err) {
    // Handle errors and send a 500 Internal Server Error response
    console.error(err);
    res.status(500).json({ error: err });
  }
});

// Default route to welcome users and provide information
app.get("/", (req, res) => {
  res.send(
    "Hello everyone. We extend a warm welcome to all of you to SubSpace App. To gain insight into the functionality of our application, please navigate to the '/api/blog-stats' route. Furthermore, for conducting searches based on specific queries within the data displayed in the aforementioned route, please proceed to the '/api/blog-search' route."
  );
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

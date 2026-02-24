 import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
 import store from "./app/store";
import React, { lazy } from "react";
import ThemeProvider from "./theme";
import Loadable from "./components/Loadable/Loadable";
import LoadingAnimation from "./components/LoadingAnimation/LoadingAnimation";
import SuccessMessage from "./components/SuccessMessage/SuccessMessage";
import "./App.css";

//----------------------import Pages-----------------------------//
 const Login = Loadable(lazy(() => import("./pages/Login/Login")));
// const Layout = Loadable(lazy(() => import("./layout/layout")));
// const Home = Loadable(lazy(() => import("./pages/Home/Home")));
const Test = Loadable(lazy(() => import("./pages/Test/Test")));

//--------------------------------------------------------------//

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Login />,
    },
    {
      path: "/test",
      element: <Test />,
    },
  ],
  {
    basename: "/img-upscale",
  }
);


const App = () => {
  return (
     <Provider store={store}>
    <ThemeProvider>
    <SuccessMessage/>
    <LoadingAnimation />
      <RouterProvider router={router} />
    </ThemeProvider>
     </Provider>
  );
};

export default App;

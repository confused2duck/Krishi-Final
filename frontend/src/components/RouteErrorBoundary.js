import React from "react";
import { Link } from "react-router-dom";

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Route render failed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#F5EDD6] min-h-screen flex items-center justify-center px-4 py-16">
          <div className="max-w-lg text-center">
            <h1 className="heading-h2 mb-4">This page could not load</h1>
            <p className="text-[#4A5D3F] mb-6">
              We hit an unexpected rendering issue, but the rest of the store is available.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/collections/all" className="btn-primary">
                Browse Products
              </Link>
              <Link to="/" className="btn-secondary">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;

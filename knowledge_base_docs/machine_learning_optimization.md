# CS301: Machine Learning & Mathematical Optimization

## 1. Linear Regression & Gradient Descent
- Hypothesis function: h_theta(x) = X @ theta.
- Loss function: Mean Squared Error (MSE) J(theta) = (1 / 2m) * sum((h(x) - y)^2).
- Vectorized gradient update: theta = theta - (alpha / m) * X.T @ (X @ theta - y).
- Feature scaling (Standardization / Z-score normalization) ensures spherical contour lines for fast gradient descent convergence.

## 2. Evaluation Metrics & Generalization
- Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and R-squared (R²).
- Bias-Variance trade-off: Underfitting vs. Overfitting. Regularization (L1 Lasso, L2 Ridge) penalizes excessive parameter magnitudes.


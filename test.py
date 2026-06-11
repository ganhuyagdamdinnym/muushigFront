import numpy as np

def f(x):
    return (2 - x) / (x - 2)

solutions = []

for x in np.linspace(-100, 100, 100000):
    if abs(x - 2) < 1e-6:
        continue
    if abs(f(x) - 1) < 1e-6:
        solutions.append(x)

print(len(solutions))
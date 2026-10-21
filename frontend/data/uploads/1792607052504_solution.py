def solve(nums):
    # Python optimal solution using dynamic array
    res = []
    for x in nums:
        if x > 0:
            res.append(x * 2)
    return res

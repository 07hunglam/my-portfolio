// sort.cpp - the three sorting algorithms behind the visualiser on hunglam.id.vn
//
// The page fetches THIS file and highlights a line as the animation steps, so
// the code on screen is the code being visualised. The JavaScript finds the
// lines to highlight by scanning for the "@step <id>" markers below; it never
// hard-codes line numbers, so this file stays free to edit.
//
// Every algorithm counts its own comparisons and swaps. Those are the same two
// numbers the page shows while it animates, which is how the two
// implementations are checked against each other.
//
// Build and run:  g++ -std=c++11 -O2 sort.cpp -o sort && ./sort

#include <cstddef>
#include <iostream>
#include <utility>
#include <vector>

struct Stats {
    long comparisons = 0;
    long swaps = 0;
};

// ---------------------------------------------------------------- bubble sort
// Walk the array over and over, swapping neighbours that are out of order.
// After pass i the largest i elements have settled at the end, so the inner
// loop can stop earlier each time. If a whole pass makes no swap we are done.
void bubbleSort(std::vector<int>& a, Stats& s) {
    for (std::size_t i = 0; i + 1 < a.size(); ++i) {
        bool swapped = false;
        for (std::size_t j = 0; j + 1 < a.size() - i; ++j) {
            ++s.comparisons;
            if (a[j] > a[j + 1]) {                       // @step bubble.compare
                std::swap(a[j], a[j + 1]);               // @step bubble.swap
                ++s.swaps;
                swapped = true;
            }
        }
        if (!swapped) break;                             // @step bubble.settled
    }
}

// ------------------------------------------------------------- insertion sort
// Keep the left side sorted. Lift the next element out, slide everything
// bigger one slot right, then drop it into the gap that opens up.
void insertionSort(std::vector<int>& a, Stats& s) {
    for (std::size_t i = 1; i < a.size(); ++i) {
        int key = a[i];                                  // @step insertion.lift
        std::size_t j = i;
        while (j > 0) {
            ++s.comparisons;
            if (a[j - 1] <= key) break;                  // @step insertion.compare
            a[j] = a[j - 1];                             // @step insertion.shift
            ++s.swaps;
            --j;
        }
        a[j] = key;                                      // @step insertion.drop
    }
}

// ------------------------------------------------------------------ quicksort
// Lomuto partition: take the last element as pivot, sweep the range moving
// everything smaller to the front, then drop the pivot at the boundary. That
// position is final, so recurse on the two sides independently.
std::size_t partition(std::vector<int>& a, std::size_t lo, std::size_t hi, Stats& s) {
    int pivot = a[hi];                                   // @step quick.pivot
    std::size_t boundary = lo;
    for (std::size_t j = lo; j < hi; ++j) {
        ++s.comparisons;
        if (a[j] < pivot) {                              // @step quick.compare
            std::swap(a[boundary], a[j]);                // @step quick.swap
            ++s.swaps;
            ++boundary;
        }
    }
    std::swap(a[boundary], a[hi]);                       // @step quick.place
    ++s.swaps;
    return boundary;
}

void quickSort(std::vector<int>& a, std::size_t lo, std::size_t hi, Stats& s) {
    if (lo >= hi) return;
    std::size_t p = partition(a, lo, hi, s);
    if (p > 0) quickSort(a, lo, p - 1, s);               // @step quick.left
    quickSort(a, p + 1, hi, s);                          // @step quick.right
}

// ----------------------------------------------------------------------- main
// Reads integers from stdin and prints, per algorithm: name, comparisons,
// swaps, then the sorted values. demo/test-parity.js feeds the same numbers to
// the JavaScript mirror and asserts every field matches.
//
//   echo "42 7 91 15 63 4 28 77" | ./sort
int main() {
    std::vector<int> input;
    for (int x; std::cin >> x;) input.push_back(x);

    const char* names[3] = {"bubble", "insertion", "quick"};
    for (int k = 0; k < 3; ++k) {
        std::vector<int> a = input;
        Stats s;
        if (k == 0) bubbleSort(a, s);
        else if (k == 1) insertionSort(a, s);
        else if (!a.empty()) quickSort(a, 0, a.size() - 1, s);

        std::cout << names[k] << ' ' << s.comparisons << ' ' << s.swaps << ' ';
        for (std::size_t i = 0; i < a.size(); ++i) std::cout << a[i] << ' ';
        std::cout << '\n';
    }
    return 0;
}

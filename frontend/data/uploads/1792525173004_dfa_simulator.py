class DFA:
    def __init__(self, states, alphabet, transitions, start_state, accept_states):
        self.states = set(states)
        self.alphabet = set(alphabet)
        self.transitions = transitions
        self.start_state = start_state
        self.accept_states = set(accept_states)

    def process(self, input_string: str) -> bool:
        current_state = self.start_state
        for symbol in input_string:
            if symbol not in self.alphabet:
                return False
            key = (current_state, symbol)
            if key not in self.transitions:
                return False
            current_state = self.transitions[key]
        return current_state in self.accept_states
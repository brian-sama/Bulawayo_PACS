import math

class AreaCalculationEngine:
    """
    Engine A: Calculates the total area from an array of geometric shapes 
    and compares it against the user's declared area.
    """
    
    # Allow a 2% margin of error for drawing discrepancies
    TOLERANCE_PERCENTAGE = 0.02 

    def calculate_shape_area(self, shape):
        """Calculates area for a single geometric shape."""
        shape_type = shape.get('type', '').lower()
        
        try:
            if shape_type == 'rectangle':
                return float(shape.get('length', 0)) * float(shape.get('width', 0))
            
            elif shape_type == 'circle':
                radius = float(shape.get('radius', 0))
                return math.pi * (radius ** 2)
            
            elif shape_type == 'triangle':
                return 0.5 * float(shape.get('base', 0)) * float(shape.get('height', 0))
                
            else:
                return 0.0 # Unknown shape
        except (ValueError, TypeError):
            return 0.0 # Handle bad data safely

    def verify_plan_area(self, declared_area: float, shapes: list) -> dict:
        """
        Calculates total area and determines if a flag should be raised.
        Returns a dictionary expected by the views.py endpoints.
        """
        calculated_total = 0.0
        
        # 1. Sum up all shapes
        if shapes and isinstance(shapes, list):
            for shape in shapes:
                calculated_total += self.calculate_shape_area(shape)
                
        # 2. Compare with declared area
        difference = abs(calculated_total - declared_area)
        allowed_variance = declared_area * self.TOLERANCE_PERCENTAGE
        
        # 3. Determine if it passes
        is_match = difference <= allowed_variance
        
        # 4. Generate the response payload
        result = {
            'declared_area': declared_area,
            'calculated_area': round(calculated_total, 2),
            'match': is_match,
            'flag_triggered': not is_match,
            'message': ''
        }
        
        if not is_match:
            result['message'] = (
                f"Area Mismatch Warning: Declared area is {declared_area} sqm, "
                f"but geometric calculation yields {round(calculated_total, 2)} sqm. "
                f"Difference exceeds the 2% allowable tolerance."
            )
            
        return result


class AutoFlaggingEngine:
    """
    Engine B: Pre-screening checks for missing documents or logical errors.
    """
    def run_pre_screening(self, plan):
        flags = []
        
        # Example check: Is the calculated area vastly different from declared?
        if plan.calculated_area and plan.declared_area:
            difference = abs(plan.calculated_area - plan.declared_area)
            if difference > (plan.declared_area * 0.02):
                flags.append({
                    'flag_type': 'ERROR',
                    'category': 'AREA_MISMATCH',
                    'message': f'Calculated area ({plan.calculated_area} sqm) does not match declared area ({plan.declared_area} sqm).'
                })
                
        # Add more automated checks here (e.g., missing Title Deed, ZESA clearance)
        
        return flags
